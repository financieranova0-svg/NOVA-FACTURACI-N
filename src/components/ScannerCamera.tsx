import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, RefreshCw, AlertCircle } from "lucide-react";

interface ScannerCameraProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function ScannerCamera({ onScan, onClose }: ScannerCameraProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "camera-barcode-reader";

  useEffect(() => {
    // Get list of available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment (back) camera
          const backCam = devices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("environment") ||
              device.label.toLowerCase().includes("trasera")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setError("No se encontraron cámaras de video en este dispositivo.");
        }
      })
      .catch((err) => {
        console.error("Error obteniendo cámaras:", err);
        setError("Error de permisos de cámara. Asegúrate de dar acceso.");
      });

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (selectedCameraId && !isScanning) {
      startScanner(selectedCameraId);
    }
  }, [selectedCameraId]);

  const startScanner = async (cameraId: string) => {
    setError(null);
    try {
      if (qrCodeInstanceRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      qrCodeInstanceRef.current = html5QrCode;
      setIsScanning(true);

      const config = {
        fps: 15,
        // Match barcode sizing ratios
        qrbox: (width: number, height: number) => {
          // Wider and shorter box is perfect for 1D barcodes
          const w = Math.floor(width * 0.85);
          const h = Math.floor(height * 0.45);
          return { width: w, height: h };
        },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          // Success callback
          playBeep();
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage) => {
          // Verbose log which can be ignored, html5-qrcode scans continuously
        }
      );
    } catch (err: any) {
      console.error("No se pudo iniciar el escáner:", err);
      setError(`No se pudo iniciar la cámara: ${err?.message || err}`);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.error("Error al detener el escáner:", err);
      }
    }
    qrCodeInstanceRef.current = null;
    setIsScanning(false);
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = 1200; // High pitch beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // Short duration
    } catch (e) {
      console.warn("No se pudo reproducir el pitido del escáner:", e);
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  return (
    <div id="camera-scanner-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-lg text-slate-100">Escáner de Cámara</h3>
          </div>
          <button
            id="close-camera-scanner"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera container */}
        <div className="relative bg-black min-h-[280px] flex items-center justify-center">
          <div id={scannerId} className="w-full h-full overflow-hidden"></div>
          
          {/* Laser visual styling overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Target bracket outline */}
              <div className="border-2 border-emerald-400/55 rounded-lg w-[85%] h-[45%] flex items-center justify-center relative">
                {/* Simulated scanning laser red line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 animate-pulse shadow-md shadow-red-500" style={{ top: "50%" }}></div>
                <span className="absolute bottom-2 text-[10px] bg-slate-900/80 px-2 py-0.5 rounded text-emerald-400/90 font-mono tracking-wider uppercase">
                  Alinee código de barras
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-4 flex flex-col items-center justify-center bg-slate-900 p-6 rounded-xl text-center border border-red-500/20">
              <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
              <p className="text-slate-200 text-sm font-medium mb-4">{error}</p>
              <button
                id="retry-camera"
                onClick={() => selectedCameraId && startScanner(selectedCameraId)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-emerald-400 transition text-xs font-semibold"
              >
                Reintentar Cámara
              </button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="border-t border-slate-800 bg-slate-950 p-4 flex justify-between items-center text-xs">
          <div className="text-slate-400">
            {cameras.length > 0 ? (
              <span className="font-medium text-slate-300">
                Cámara activa: {cameras.find(c => c.id === selectedCameraId)?.label.slice(0, 24) || "Predeterminada"}...
              </span>
            ) : (
              <span>Cargando recursos de cámara...</span>
            )}
          </div>

          {cameras.length > 1 && (
            <button
              id="switch-camera"
              onClick={switchCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Girar Cámara
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
