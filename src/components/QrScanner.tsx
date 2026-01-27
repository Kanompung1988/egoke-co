import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const QrScanner = ({ onScanSuccess, onScanFailure }: QrScannerProps) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Get available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // เริ่มด้วยกล้องหลัง (environment) ถ้ามี
          const backCameraIndex = devices.findIndex(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          setCurrentCameraIndex(backCameraIndex >= 0 ? backCameraIndex : 0);
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
      });
  }, []);

  // Start scanning
  useEffect(() => {
    if (cameras.length === 0) return;

    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    const startScanning = async () => {
      try {
        setIsScanning(true);
        await scanner.start(
          cameras[currentCameraIndex].id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            scanner.stop().catch(console.error);
            setIsScanning(false);
          },
          (errorMessage) => {
            if (onScanFailure && !errorMessage.includes('NotFoundException')) {
              onScanFailure(errorMessage);
            }
          }
        );
      } catch (err) {
        console.error('Error starting scanner:', err);
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [cameras, currentCameraIndex, onScanSuccess, onScanFailure]);

  // Switch camera
  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      await scanner.stop();
    }

    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
  };

  return (
    <div className="relative">
      <div id="reader" className="rounded-xl overflow-hidden"></div>
      
      {/* Camera Switch Button */}
      {cameras.length > 1 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={switchCamera}
            disabled={!isScanning}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95"
          >
            <i className="ri-camera-switch-line text-xl"></i>
            <span>สลับกล้อง ({currentCameraIndex === 0 ? 'หน้า' : 'หลัง'})</span>
          </button>
        </div>
      )}
      
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          💡 อนุญาตการเข้าถึงกล้องเพื่อสแกน QR Code
        </p>
      </div>
    </div>
  );
};

export default QrScanner;