export const Footer = () => {
    return (
        <footer id="footer" className="footer">
            <div className="footer-sides">
                <div className="footer-left">
                    <strong>{process.env.APP_NAME}</strong>
                    <p>Enjoy Mallorca in its purest form from our cozy hotel located in a spectacular area of Mallorca, historical and artistic heritage.
                        A cozy and romantic hotel to enjoy this unique enclave in a simple and elegant environment.</p>
                </div>
                <div className="footer-right">
                    <span>Tlf: <a href="tel:123456789">Call us</a></span>
                    <span>Whatsapp: <a href="https://api.whatsapp.com/send?phone=123456789">Send us a message</a> </span>
                    <span>Email: <a href="mailto:hotelaurademallorca@aurademallorca.com">Contact us</a></span>
                </div>
            </div>
            <div>
                <em>Page is running in {import.meta.env.MODE}</em>
            </div>
        </footer>
    )
}