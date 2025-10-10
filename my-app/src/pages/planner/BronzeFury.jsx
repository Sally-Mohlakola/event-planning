export default function BronzeFury(onClose) {
    const [showBronzeFuryPopup, setShowBronzeFuryPopup] = useState(true);
    
    return (
        <section className="popup-overlay">
        <div className="bronze-fury-popup">
            <h2>BronzeFury Integration Coming Soon!</h2>
            <p>This feature will allow you to import guests directly from BronzeFury.</p>
            <p>Stay tuned for updates!</p>
            <button className="close-btn" onClick={onClose}>Close</button>
        </div>
        </section>
    );
}