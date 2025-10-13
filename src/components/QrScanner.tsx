import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const QrScanner = ({ onScanSuccess, onScanFailure }: QrScannerProps) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader', // ID ของ div ที่จะให้กล้องไปแสดงผล
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 10, // Frame per second
      },
      false 
    );

    const handleSuccess = (decodedText: string) => {
      onScanSuccess(decodedText);
    };

    const handleError = (error: string) => {
      if (onScanFailure) {
        onScanFailure(error);
      }

    };

    scanner.render(handleSuccess, handleError);

  
    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear scanner.", error);
      });
    };
  }, [onScanSuccess, onScanFailure]);

 
  return <div id="reader"></div>;
};

export default QrScanner;