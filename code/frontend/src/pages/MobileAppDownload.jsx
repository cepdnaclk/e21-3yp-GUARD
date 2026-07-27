import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import '../styles/mobile-app-download.css';

export default function MobileAppDownload() {
  return (
    <div className="mad-wrapper">
      <PublicNav />

      <div className="mad-page">
        <div className="mad-card">
          <h1 className="mad-title">Download Mobile App</h1>
          <p className="mad-desc">
            Connect to your Aquarium via your Android Mobile Phone.
          </p>
          <p className="scan-qr-text">
            SCAN QR
          </p>

          <div className="mad-qr-holder" aria-label="QR code placeholder">
            <span className="mad-qr-holder-text">QR code coming soon</span>
          </div>

          <Link to="/" className="mad-back-link">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
