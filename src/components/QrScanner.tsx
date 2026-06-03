import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, X, Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface QrScannerProps {
  onScanSuccess: (scannedCode: string) => void;
  onClose: () => void;
  expectedCode: string;
}

export default function QrScanner({ onScanSuccess, onClose, expectedCode }: QrScannerProps) {
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'error' | 'permission-denied'>('requesting');
  const [scannerError, setScannerError] = useState<string>('');
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-viewport";

  // Robust function to extract the 4-digit code from QR-decoded text
  const extractCode = (text: string): string => {
    // Try to find code=XXXX parameter (e.g. https://domain.com/?code=1321)
    const urlMatch = text.match(/[?&]code=(\d{4})/i);
    if (urlMatch) return urlMatch[1];
    
    // Check if the decoded string has any 4-digit consecutive number block
    const digitsMatch = text.match(/\b\d{4}\b/);
    if (digitsMatch) return digitsMatch[0];
    
    // Fallback to trimmed text
    return text.trim();
  };

  useEffect(() => {
    let isMounted = true;
    let scannerStarted = false;

    // Timeout fallback for permissions or initialization delay
    const startScanner = async () => {
      try {
        setCameraState('requesting');
        setScannerError('');

        // Ensure scanner container is in DOM
        const container = document.getElementById(scannerId);
        if (!container) {
          throw new Error("מפתח ה-DOM לסריקה לא נמצא");
        }

        // Initialize instance
        const html5Qrcode = new Html5Qrcode(scannerId);
        qrCodeInstanceRef.current = html5Qrcode;

        // Configuration
        const config = {
          fps: 15,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0
        };

        // Start scanning with default environment (back) camera
        await html5Qrcode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isMounted) return;
            const parsedCode = extractCode(decodedText);
            onScanSuccess(parsedCode);
          },
          () => {
            // Quietly suppress verbose frame evaluation warnings
          }
        );

        if (isMounted) {
          setCameraState('active');
          scannerStarted = true;
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Camera scan error:", err);
        const errMsg = err?.toString() || '';
        if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission denied")) {
          setCameraState('permission-denied');
        } else {
          setCameraState('error');
          setScannerError("לא ניתן לגשת למצלמת המכשיר. בדקו הגדרות או נסו להזין ידנית.");
        }
      }
    };

    // Small delay to ensure React commits DOM structure
    const timer = setTimeout(() => {
      startScanner();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      // Cleanup the scanner instance on unmount
      if (qrCodeInstanceRef.current) {
        const instance = qrCodeInstanceRef.current;
        if (instance.isScanning) {
          instance.stop().catch(e => console.warn("Failed to stop scanner on unmount:", e));
        }
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-4 shadow-2xl relative overflow-hidden transition duration-300">
      
      {/* Header and Close */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
          <h4 className="text-sm font-bold text-white">סורק קוד QR מצלמה</h4>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg transition"
          title="סגור סורק"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Viewfinder Space */}
      <div className="relative w-full max-w-xs mx-auto aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
        
        {/* The target rendering target for html5-qrcode */}
        <div 
          id={scannerId} 
          className="w-full h-full object-cover"
        />

        {/* Requesting State Overlay */}
        {cameraState === 'requesting' && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center space-y-3 p-4 text-center z-10 animate-fade-in">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">מבקש גישה למצלמת המכשיר...</p>
            <p className="text-[10px] text-slate-400">אנא אשרו את השימוש במצלמה בדפדפן במידה ותתבקשו</p>
          </div>
        )}

        {/* Error / Permission Denied States */}
        {(cameraState === 'error' || cameraState === 'permission-denied') && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center z-10 space-y-3">
            <CameraOff className="w-10 h-10 text-red-500 shrink-0" />
            
            {cameraState === 'permission-denied' ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">גישת המצלמה נחסמה</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  הדפדפן חסם את הרשאת המצלמה באתר זה. יש לאפשר גישת מצלמה בהגדרות הדפדפן שלכם, או להקליד את הקוד באופן ידני.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">שגיאת מצלמה</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {scannerError || "לא הצלחנו להפעיל את עדשת המצלמה במכשיר."}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>רענון האפליקציה</span>
            </button>
          </div>
        )}

        {/* Active Laser Line Guide Overlay */}
        {cameraState === 'active' && (
          <>
            {/* Corner Bracket Guides for QR layout */}
            <div className="absolute top-6 left-6 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg pointer-events-none z-20" />
            <div className="absolute top-6 right-6 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg pointer-events-none z-20" />
            <div className="absolute bottom-6 left-6 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg pointer-events-none z-20" />
            <div className="absolute bottom-6 right-6 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg pointer-events-none z-20" />
            
            {/* Animated Laser line scanning effect */}
            <div className="absolute w-[80%] left-[10%] h-[2px] bg-red-500 opacity-80 animate-bounce pointer-events-none z-10 shadow-[0_0_8px_rgba(239,68,68,0.8)]" style={{ animationDuration: '2.5s' }} />
          </>
        )}
      </div>

      {/* Advice block */}
      <div className="text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          קרבו את הטלפון אל <strong className="text-white">קוד ה-QR המופיע אצל המדריך</strong> בתחנה הנוכחית. 
          <br />לאחר סריקה מוצלחת, הקוד יתמלא במערכת אוטומטית!
        </p>
      </div>

    </div>
  );
}
