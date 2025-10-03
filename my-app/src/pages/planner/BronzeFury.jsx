export default function BronzeFury(onClose) {
    return (
        <section className="popup-overlay" onClick={onClose}>
            <div className="bronze-fury-popup">
                <h2>BronzeFury Integration Coming Soon!</h2>
                <p>This feature will allow you to import guests directly from BronzeFury.</p>
                <p>Stay tuned for updates!</p>
            </div>
        </section>
    );
}