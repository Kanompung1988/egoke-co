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
          
          // 🎯 บังคับใช้กล้องหลัง (environment) เป็นค่าเริ่มต้น
          // ลองหาจาก label ก่อน
          let backCameraIndex = devices.findIndex(
            (d) => d.label.toLowerCase().includes('back') || 
                   d.label.toLowerCase().includes('rear') ||
                   d.label.toLowerCase().includes('environment')
          );
          
          // ถ้าไม่เจอ ให้ใช้กล้องตัวสุดท้าย (มักจะเป็นกล้องหลัง)
          if (backCameraIndex < 0 && devices.length > 1) {
            backCameraIndex = devices.length - 1;
          }
          
          // ถ้ายังไม่เจอ ใช้กล้องแรก
          if (backCameraIndex < 0) {
            backCameraIndex = 0;
          }
          
          console.log('📷 Selected camera:', devices[backCameraIndex].label);
          setCurrentCameraIndex(backCameraIndex);
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
        
        // 🔍 ใช้ facingMode แทน cameraId เพื่อบังคับใช้กล้องหลัง
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };
        
        // พยายามใช้ facingMode: environment (กล้องหลัง) ก่อน
        try {
          await scanner.start(
            { facingMode: 'environment' }, // 🎯 บังคับกล้องหลัง
            config,
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
        } catch (facingModeError) {
          // ถ้า facingMode ไม่ได้ผล ใช้ camera ID แทน
          console.log('Fallback to camera ID:', cameras[currentCameraIndex].label);
          await scanner.start(
            cameras[currentCameraIndex].id,
            config,
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
        }
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
            <span>สลับกล้อง</span>
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