import { useTranslation } from "react-i18next";
export const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer id="footer" className="footer">
            <div className="footer-sides">
                <div className="footer-left">
                    <strong>{process.env.APP_NAME}</strong>
                    <p>{t("footer_description")}</p>
                </div>
                <div className="footer-right">
                    <span>Tlf: <a href="tel:123456789">{t("footer_callus")}</a></span>
                    <span>Whatsapp: <a href="https://api.whatsapp.com/send?phone=123456789">{t("footer_sendmsg")}</a> </span>
                    <span>Email: <a href="mailto:hotelaurademallorca@aurademallorca.com">{t("footer_contact")}</a></span>
                </div>
            </div>
            <div>
                <em>Page is running in {import.meta.env.MODE}</em>
            </div>
        </footer>
    )
}