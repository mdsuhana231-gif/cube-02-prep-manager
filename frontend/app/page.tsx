"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Verdict = "PASS" | "FAIL" | "UNCERTAIN";
type Photo = { photo_id: string; filename: string; mime_type: string; data_url: string; source: "upload" | "camera" };
type BarcodeScan = { barcode_value: string; barcode_type: string; scan_source: "camera" | "manual" | "vision_ocr"; scan_timestamp: string };
type Evidence = { evidence_id: string; check_id: string; source_type: string; observation: string; source_ref: string | null; reference_location: string | null; bounding_box: unknown | null; explanation: string };
type Check = { check_key: string; label: string; verdict: Verdict; explanation: string; evidence_refs: string[] };
type Result = { unit_id: string; analysis_status: "complete" | "pending"; overall_status: Verdict | "PENDING_REVIEW"; model_calls: number; capture: { capture_id: string; status: string; photo_refs: string[] }; checks: Check[]; evidence: Evidence[] };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement | HTMLImageElement): Promise<Array<{ rawValue: string; format: string }>> };
type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorInstance;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const badgeStyles: Record<string, string> = { PASS: "bg-[#cbe6d4] text-[#174b32]", FAIL: "bg-[#ee806e] text-[#5e2119]", UNCERTAIN: "bg-[#f4c66a] text-[#5c4310]", PENDING_REVIEW: "bg-[#d8d9d0] text-[#3b403a]" };

function readFile(file: File, source: Photo["source"]): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ photo_id: crypto.randomUUID(), filename: file.name, mime_type: file.type, data_url: String(reader.result), source });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [unitId, setUnitId] = useState("UNIT-DEMO-1");
  const [orgId, setOrgId] = useState("org_demo_alpha");
  const [sku, setSku] = useState("");
  const [asin, setAsin] = useState("");
  const [fnsku, setFnsku] = useState("");
  const [profile, setProfile] = useState("clean");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [barcode, setBarcode] = useState<BarcodeScan | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [scannerError, setScannerError] = useState("");
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerFrameRef = useRef<number | null>(null);
  const scannerBusyRef = useRef(false);
  const scannerDetectorRef = useRef<BarcodeDetectorInstance | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  function stopBarcodeScanner() {
    if (scannerFrameRef.current !== null) cancelAnimationFrame(scannerFrameRef.current);
    scannerFrameRef.current = null;
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
    if (scannerVideoRef.current) scannerVideoRef.current.srcObject = null;
    scannerDetectorRef.current = null;
    scannerBusyRef.current = false;
    setScannerOpen(false);
  }

  useEffect(() => () => {
    stopCamera();
    stopBarcodeScanner();
  }, []);

  async function openCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not provide webcam access. Use Upload photos instead.");
      setCameraOpen(true);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (firstError) {
        const errorName = firstError instanceof DOMException ? firstError.name : "";
        if (errorName === "NotAllowedError" || errorName === "SecurityError") throw firstError;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (cameraRequestError) {
      const errorName = cameraRequestError instanceof DOMException ? cameraRequestError.name : "";
      setCameraError(errorName === "NotAllowedError" || errorName === "SecurityError"
        ? "Camera permission was denied. Allow camera access in the browser, or use Upload photos."
        : "No usable camera was found. Check the webcam connection, or use Upload photos.");
      setCameraOpen(true);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setCameraError("The camera preview is not ready yet. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    setPhotos((current) => [...current, { photo_id: crypto.randomUUID(), filename: `camera-${timestamp}.jpg`, mime_type: "image/jpeg", data_url: canvas.toDataURL("image/jpeg", 0.9), source: "camera" }]);
    stopCamera();
  }

  function setDetectedBarcode(rawValue: string, format: string) {
    setBarcode({ barcode_value: rawValue, barcode_type: format, scan_source: "camera", scan_timestamp: new Date().toISOString() });
    setScannerMessage("Barcode detected");
    stopBarcodeScanner();
  }

  function detectLiveBarcode() {
    const video = scannerVideoRef.current;
    const detector = scannerDetectorRef.current;
    if (!video || !detector || scannerBusyRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      scannerFrameRef.current = requestAnimationFrame(detectLiveBarcode);
      return;
    }
    scannerBusyRef.current = true;
    void detector.detect(video).then((matches) => {
      if (matches[0]?.rawValue) setDetectedBarcode(matches[0].rawValue, matches[0].format);
    }).catch(() => {
      setScannerError("Barcode detection could not read this view. Try another angle or capture an image.");
    }).finally(() => {
      scannerBusyRef.current = false;
      if (scannerStreamRef.current) scannerFrameRef.current = requestAnimationFrame(detectLiveBarcode);
    });
  }

  async function openBarcodeScanner() {
    setScannerError("");
    setScannerMessage("");
    setScannerOpen(true);
    const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (Detector) {
      try {
        scannerDetectorRef.current = new Detector({ formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] });
      } catch {
        scannerDetectorRef.current = null;
      }
    }
    if (!Detector || !scannerDetectorRef.current) setScannerMessage("Barcode scanner not supported — use manual entry or capture an image");
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("This browser does not provide camera access. Use manual entry or capture an image.");
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (firstError) {
        const errorName = firstError instanceof DOMException ? firstError.name : "";
        if (errorName === "NotAllowedError" || errorName === "SecurityError") throw firstError;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      scannerStreamRef.current = stream;
      requestAnimationFrame(() => {
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          void scannerVideoRef.current.play();
          if (scannerDetectorRef.current) scannerFrameRef.current = requestAnimationFrame(detectLiveBarcode);
        }
      });
    } catch (scannerRequestError) {
      const errorName = scannerRequestError instanceof DOMException ? scannerRequestError.name : "";
      setScannerError(errorName === "NotAllowedError" || errorName === "SecurityError"
        ? "Camera permission was denied. Allow camera access in the browser, or use manual entry."
        : "No usable camera was found. Check the webcam connection, or use manual entry.");
    }
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>, source: Photo["source"]) {
    const files = Array.from(event.target.files ?? []).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    const existing = new Set(photos.map((photo) => `${photo.filename}:${photo.mime_type}`));
    try {
      const next = await Promise.all(files.filter((file) => !existing.has(`${file.name}:${file.type}`)).map((file) => readFile(file, source)));
      setPhotos((current) => [...current, ...next]);
    } catch (fileError) { setError(fileError instanceof Error ? fileError.message : "Could not add the photo."); }
    event.target.value = "";
  }

  async function captureBarcodeImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const photo = await readFile(file, "camera");
      setPhotos((current) => current.some((item) => item.data_url === photo.data_url) ? current : [...current, photo]);
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) { setScannerMessage("Barcode scanner not supported — use manual entry or capture an image"); return; }
      const image = new Image();
      image.src = photo.data_url;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not read the barcode photo.")); });
      const detector = new Detector({ formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] });
      const matches = await detector.detect(image);
      if (!matches[0]?.rawValue) { setScannerMessage("No barcode detected. Try another image or use manual entry."); return; }
      setDetectedBarcode(matches[0].rawValue, matches[0].format);
    } catch { setScannerError("Barcode image capture could not be completed. Use manual entry instead."); }
  }

  function saveManualBarcode() {
    if (!manualBarcode.trim()) return;
    setBarcode({ barcode_value: manualBarcode.trim(), barcode_type: "manual", scan_source: "manual", scan_timestamp: new Date().toISOString() });
    setManualBarcode("");
  }

  async function runAnalysis(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/units/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        unit: { unit_id: unitId, org_id: orgId, sku: sku || null, asin: asin || null, fnsku: fnsku || null, barcode: barcode?.barcode_value ?? null, mock_profile: profile },
        photos, barcode_scan: barcode,
      }) });
      if (!response.ok) throw new Error("The analysis service returned an error.");
      setResult(await response.json());
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to reach the analysis service."); }
    finally { setBusy(false); }
  }

  return <main className="prep-shell min-h-screen bg-[var(--paper)] px-5 py-5 text-[var(--ink)] sm:px-10 lg:px-16"><div className="mx-auto max-w-7xl">
    <header className="site-header flex items-center justify-between border-b-2 border-black py-4"><a href="#top" className="brand-mark flex items-center gap-3" aria-label="Prep Manager home"><span className="brand-cube">C</span><span className="text-xs font-black uppercase tracking-[0.16em] sm:text-sm">Prep Manager<span className="block text-[10px] font-bold tracking-[0.22em]">CUBE / COMMERCE CONTEXT</span></span></a><nav className="flex items-center gap-5 text-xs font-black uppercase tracking-[0.12em] sm:gap-8"><a className="hidden sm:inline" href="#workflow">Workflow</a><a className="nav-cta" href="#new-capture">Open workspace <span aria-hidden="true">↘</span></a></nav></header>
    <section id="top" className="hero-section grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-20"><div><p className="mb-5 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0_#000]"><span className="status-dot" /> Prep intelligence / v02</p><h1 className="hero-title text-5xl font-black leading-[0.94] sm:text-7xl lg:text-[88px]">Prep right.<br /><span className="highlight-word">Prove every call.</span></h1><p className="mt-6 max-w-xl text-base font-medium leading-7 sm:text-lg">One unit, one model pass, evidence for every decision. Make prep compliance faster, clearer, and ready for review.</p><div className="mt-8 flex flex-wrap items-center gap-5"><a href="#new-capture" className="primary-cta">Start a capture <span aria-hidden="true">↘</span></a><span className="text-xs font-bold uppercase tracking-[0.1em]">Evidence-led unit review</span></div></div><div className="hero-visual" aria-label="A prep check turns product evidence into a reviewable decision"><div className="visual-topline"><span>UNIT CHECK / 001</span><span>LIVE SYSTEM</span></div><div className="visual-scan"><div className="scan-frame"><div className="scan-crosshair">+</div><div className="package-box"><span>FRAGILE</span><b>PRODUCT<br />UNIT</b><i>SKU—2048</i></div><div className="scan-line" /></div><div className="scan-caption"><span className="scan-badge">OK</span><div><b>Evidence captured</b><small>3 checks / 1 unit</small></div><span className="scan-arrow">↗</span></div></div><div className="visual-foot"><span>CAPTURE → CHECK → REVIEW</span><span>● READY</span></div><span className="hero-star" aria-hidden="true">✳</span></div></section>
    <div className="ticker" aria-label="Prep Manager announcement"><div className="ticker-track"><div className="ticker-set"><span>ONE UNIT. ONE MODEL PASS.</span><b>✳</b><span>EVIDENCE FOR EVERY DECISION.</span><b>✳</b><span>BUILT FOR THE PREP FLOOR.</span><b>✳</b></div><div className="ticker-set" aria-hidden="true"><span>ONE UNIT. ONE MODEL PASS.</span><b>✳</b><span>EVIDENCE FOR EVERY DECISION.</span><b>✳</b><span>BUILT FOR THE PREP FLOOR.</span><b>✳</b></div></div></div>
    <section id="workflow" className="workflow-section py-12 sm:py-16"><div className="section-heading"><div><p className="eyebrow">THE WORKFLOW / 01—03</p><h2>From evidence to action.</h2></div><span className="section-note">A clearer read on every unit.</span></div><div className="feature-grid"><article className="feature-card feature-lime"><span className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="3" y="5" width="18" height="15" rx="1"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.2-2h5.6L16 5"/></svg></span><span className="feature-number">01 / CAPTURE</span><h3>Get the whole picture.</h3><p>Upload product views, use your camera, or scan a barcode. Keep all unit evidence together.</p></article><article className="feature-card feature-white"><span className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M4 4h16v16H4zM8 9h8M8 13h5M8 17h8"/><path d="m15 14 2 2 4-5"/></svg></span><span className="feature-number">02 / ANALYZE</span><h3>Checks with receipts.</h3><p>Run once for the unit and see each compliance verdict alongside its supporting evidence.</p></article><article className="feature-card feature-white"><span className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 3h14v18H5zM8 8h8M8 12h5M8 16h8"/><path d="m13 12 2 2 4-4"/></svg></span><span className="feature-number">03 / REVIEW</span><h3>Make the call yours.</h3><p>Inspect evidence, record operator overrides, and keep the original model verdict preserved.</p></article></div></section>
    <div className="workspace-divider"><span>YOUR WORKSPACE</span><span>SCROLL TO START <b>↓</b></span></div>
    <div id="new-capture" className="grid gap-8 pb-16 lg:grid-cols-[390px_1fr]">
      <section className="capture-panel animate-lift border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000] sm:p-6"><div className="mb-7 flex items-center justify-between"><div><p className="eyebrow">WORKSPACE / NEW UNIT</p><h2 className="font-display text-3xl">New capture</h2></div><span className="h-3 w-3 rounded-full bg-[var(--lime)] ring-2 ring-black" aria-label="Ready" /></div>
        <form onSubmit={runAnalysis} className="space-y-6">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#697167]">Photo input</p><div className="grid grid-cols-2 gap-2"><label className="cursor-pointer bg-[var(--mint)] px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.08em]">Upload photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addPhotos(event, "upload")} className="sr-only" /></label><button type="button" onClick={openCamera} className="border border-[var(--ink)] px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.08em]">Take photo</button></div></div>
          {photos.length > 0 && <div className="grid grid-cols-3 gap-2">{photos.map((photo) => <div key={photo.photo_id} className="relative"><img src={photo.data_url} alt={photo.filename} className="aspect-square w-full object-cover" /><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.photo_id !== photo.photo_id))} className="absolute right-1 top-1 bg-[var(--ink)] px-2 py-1 text-xs text-white" aria-label={`Remove ${photo.filename}`}>×</button><p className="truncate text-[10px] text-[#697167]">{photo.filename}</p></div>)}</div>}
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#697167]">Barcode</p><button type="button" onClick={openBarcodeScanner} className="block w-full border border-[var(--ink)] px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.08em]">Scan barcode</button><div className="mt-2 flex gap-2"><input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} placeholder="Manual barcode fallback" className="min-w-0 flex-1 border-b-2 border-[var(--line)] bg-transparent py-2 text-sm outline-none focus:border-[var(--ink)]" /><button type="button" onClick={saveManualBarcode} className="border border-[var(--ink)] px-3 text-xs font-bold">Save</button></div>{barcode && <p className="mt-2 bg-[#fff8df] p-2 text-xs">{barcode.barcode_value} · {barcode.barcode_type} · {barcode.scan_source}</p>}{scannerMessage && <p className="mt-2 bg-[#fff8df] p-2 text-xs">{scannerMessage}</p>}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4"><Field label="Unit ID" value={unitId} setValue={setUnitId} required /><Field label="SKU" value={sku} setValue={setSku} /><Field label="ASIN" value={asin} setValue={setAsin} /><Field label="FNSKU" value={fnsku} setValue={setFnsku} /><Field label="Organization" value={orgId} setValue={setOrgId} required /></div>
          <label className="block text-sm font-bold">Demo profile<select value={profile} onChange={(event) => setProfile(event.target.value)} className="mt-2 w-full border border-[var(--line)] bg-transparent p-3 outline-none"><option value="clean">Clean unit</option><option value="issues">Known issues</option><option value="missing_polybag">Missing polybag</option><option value="polybag_not_sealed">Polybag not sealed</option><option value="missing_warning">Missing warning</option><option value="bad_fnsku">Bad FNSKU placement</option><option value="barcode_visible">Original barcode visible</option><option value="expiry_unclear">Expiry unclear</option><option value="handling_mark_missing">Handling mark missing</option><option value="uncertain">Ambiguous / uncertain</option><option value="model_failure">Model failure</option></select></label>
          <p className="text-xs leading-5 text-[#697167]">Collect all useful views first. Analysis runs once for the whole unit. Mock mode remains deterministic; uploaded images are not claimed as analyzed by the mock provider.</p><button disabled={busy} className="w-full bg-[var(--ink)] px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#38544a] disabled:cursor-wait disabled:opacity-60">{busy ? "Analyzing unit..." : "Analyze unit"}</button>
        </form>{error && <p className="mt-5 border-l-4 border-[#ee806e] bg-[#fff0eb] p-3 text-sm">{error}</p>}
      </section>
      <section className="result-panel animate-lift [animation-delay:120ms]">{!result ? <div className="empty-state flex min-h-[450px] items-center justify-center border-2 border-black p-10 text-center"><div><span className="empty-symbol" aria-hidden="true">↗</span><p className="mb-3 font-display text-4xl">Awaiting a unit</p><p className="max-w-sm text-sm leading-6">Upload photos, take a few views, or scan a barcode before running the unit analysis.</p><span className="empty-tag">NO UNIT IN QUEUE</span></div></div> : <AnalysisResult result={result} orgId={orgId} />}</section>
    </div>
  </div>{cameraOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,33,31,0.82)] p-4" role="dialog" aria-modal="true" aria-labelledby="camera-title"><div className="w-full max-w-2xl border border-[var(--ink)] bg-[#fffdf7] p-4 shadow-[8px_8px_0_#17211f]"><div className="mb-4 flex items-center justify-between"><h2 id="camera-title" className="font-display text-3xl">Take photo</h2><button type="button" onClick={stopCamera} className="border border-[var(--line)] px-3 py-1 text-sm font-bold">Close</button></div>{cameraError ? <p className="border-l-4 border-[var(--coral)] bg-[#fff0eb] p-4 text-sm leading-6">{cameraError}</p> : <video ref={videoRef} autoPlay muted playsInline className="max-h-[65vh] w-full bg-[#17211f] object-contain" aria-label="Live camera preview" />}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={stopCamera} className="border border-[var(--line)] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em]">Cancel</button>{!cameraError && <button type="button" onClick={capturePhoto} className="bg-[var(--ink)] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white">Capture photo</button>}</div></div></div>}{scannerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,33,31,0.82)] p-4" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><div className="w-full max-w-2xl border border-[var(--ink)] bg-[#fffdf7] p-4 shadow-[8px_8px_0_#17211f]"><div className="mb-4 flex items-center justify-between"><h2 id="scanner-title" className="font-display text-3xl">Scan barcode</h2><button type="button" onClick={stopBarcodeScanner} className="border border-[var(--line)] px-3 py-1 text-sm font-bold">Cancel</button></div>{scannerError && <p className="mb-3 border-l-4 border-[var(--coral)] bg-[#fff0eb] p-4 text-sm leading-6">{scannerError}</p>}{scannerMessage && <p className="mb-3 bg-[#fff8df] p-3 text-sm leading-5">{scannerMessage}</p>}{!scannerError && <><p className="mb-3 text-sm text-[#596158]">{scannerMessage || "Scanning..."}</p><video ref={scannerVideoRef} autoPlay muted playsInline className="max-h-[55vh] w-full bg-[#17211f] object-contain" aria-label="Live barcode scanner preview" /></>}{<label className="mt-4 block cursor-pointer border border-[var(--line)] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em]">Capture barcode image<input type="file" accept="image/*" capture="environment" onChange={captureBarcodeImage} className="sr-only" /></label>}<p className="mt-2 text-center text-xs text-[#697167]">A scanned barcode identifies a value only; it does not establish compliance.</p></div></div>}</main>;
}

function Field({ label, value, setValue, required = false }: { label: string; value: string; setValue: (value: string) => void; required?: boolean }) { return <label className="block text-sm font-bold">{label}<input value={value} onChange={(event) => setValue(event.target.value)} required={required} className="mt-2 w-full border-b-2 border-[var(--line)] bg-transparent px-0 py-2 text-sm outline-none focus:border-[var(--ink)]" /></label>; }

function AnalysisResult({ result, orgId }: { result: Result; orgId: string }) {
  const evidenceById = new Map(result.evidence.map((item) => [item.evidence_id, item]));
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
  const [reason, setReason] = useState("");
  const [operatorId, setOperatorId] = useState("operator_demo");
  const [newVerdict, setNewVerdict] = useState<Verdict>("UNCERTAIN");
  const [overrideMessage, setOverrideMessage] = useState("");

  async function submitOverride(event: FormEvent) {
    event.preventDefault();
    if (!selectedCheck || !reason.trim()) return;
    const response = await fetch(`${API_URL}/api/v1/units/${result.unit_id}/overrides?org_id=${encodeURIComponent(orgId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ original_verdict: selectedCheck.verdict, new_verdict: newVerdict, reason, operator_id: operatorId }) });
    if (response.ok) { setOverrideMessage(`Override recorded as ${newVerdict}. The original verdict remains preserved.`); setReason(""); setSelectedCheck(null); }
    else setOverrideMessage("Override could not be recorded.");
  }

  return <div><div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#697167]">Analysis / {result.unit_id}</p><h2 className="font-display text-4xl">Compliance review</h2></div><div className={`px-4 py-2 text-sm font-bold tracking-[0.1em] ${badgeStyles[result.overall_status]}`}>{result.overall_status.replace("_", " ")}</div></div><div className="mb-6 grid gap-3 sm:grid-cols-3"><Metric label="Capture" value={result.capture.capture_id} /><Metric label="Evidence objects" value={String(result.evidence.length)} /><Metric label="Model calls" value={String(result.model_calls)} /></div><div className="grid gap-3">{result.checks.map((check) => <article key={check.check_key} className="border border-[var(--line)] bg-[#fffdf7] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-bold">{check.label}</h3><div className="flex items-center gap-2"><span className={`px-3 py-1 text-xs font-bold tracking-[0.12em] ${badgeStyles[check.verdict]}`}>{check.verdict}</span><button type="button" onClick={() => { setSelectedCheck(check); setNewVerdict(check.verdict); }} className="border border-[var(--line)] px-2 py-1 text-xs font-bold">Review</button></div></div><p className="mt-3 text-sm leading-6 text-[#596158]">{check.explanation}</p><div className="mt-4 space-y-2">{check.evidence_refs.map((id) => { const evidence = evidenceById.get(id); return evidence ? <div key={id} className="border-l-2 border-[var(--gold)] bg-[#fff8df] p-3 text-xs leading-5"><p className="font-bold uppercase tracking-[0.1em] text-[#6d5a22]">{evidence.source_type === "mock_observation" ? "Mock deterministic evidence" : "Provider evidence"}</p><p className="mt-1">Observed: <strong>{evidence.observation}</strong>{evidence.reference_location && ` · ${evidence.reference_location}`}</p><p className="mt-1 text-[#6b6651]">{evidence.explanation}</p></div> : null; })}</div></article>)}</div>{selectedCheck && <form onSubmit={submitOverride} className="mt-6 border border-[var(--ink)] bg-[#fffdf7] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#697167]">Human review / {selectedCheck.label}</p><p className="mt-2 text-sm">Original verdict: <strong>{selectedCheck.verdict}</strong></p><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={operatorId} onChange={(event) => setOperatorId(event.target.value)} placeholder="Reviewer" className="border-b-2 border-[var(--line)] bg-transparent py-2 text-sm outline-none" required /><select value={newVerdict} onChange={(event) => setNewVerdict(event.target.value as Verdict)} className="border border-[var(--line)] bg-transparent px-2 text-sm"><option>PASS</option><option>FAIL</option><option>UNCERTAIN</option></select><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Override reason" className="border-b-2 border-[var(--line)] bg-transparent py-2 text-sm outline-none" required /></div><div className="mt-4 flex gap-2"><button className="bg-[var(--ink)] px-4 py-2 text-xs font-bold uppercase text-white">Record override</button><button type="button" onClick={() => setSelectedCheck(null)} className="border border-[var(--line)] px-4 py-2 text-xs font-bold">Cancel</button></div></form>}{overrideMessage && <p className="mt-4 bg-[var(--mint)] p-3 text-sm">{overrideMessage}</p>}<div className="mt-6 border-l-4 border-[var(--gold)] bg-[#fff8df] p-4 text-sm leading-6"><strong>Capture record:</strong> {result.capture.status}. {result.analysis_status === "pending" ? "Analysis could not be completed. Human review required." : "The original automated decisions remain attached to this capture."}</div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border-t-2 border-[var(--ink)] pt-2"><p className="text-xs uppercase tracking-[0.14em] text-[#697167]">{label}</p><p className="mt-1 truncate font-bold">{value}</p></div>; }
