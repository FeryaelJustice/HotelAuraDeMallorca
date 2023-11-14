import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom"

export const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer id="footer" className="footer">
            <div className="footer-sides">
                <div className="footer-left">
                    <u><strong>{process.env.APP_NAME}</strong></u>
                    <p>{t("footer_description")}</p>
                </div>
                <div className="footer-right">
                    <span>Tlf: <a href="tel:123456789">{t("footer_callus")}</a></span>
                    <span>Whatsapp: <a href="https://api.whatsapp.com/send?phone=123456789">{t("footer_sendmsg")}</a> </span>
                    <span>Email: <a href="mailto:hotelaurademallorca@aurademallorca.com">{t("footer_contact")}</a></span>
                    <div className="footer-right-legal">
                        <span><NavLink to="/privacy-policy">{t("privacyPolicy_title")}</NavLink></span>
                        <span><NavLink to="/legal-notice">{t("legalNotice_title")}</NavLink></span>
                        <span><NavLink to="/cookies-policy">{t("cookiePolicy_title")}</NavLink></span>
                        <span><NavLink to="/terms-of-use">{t("termsOfUse_title")}</NavLink></span>
                    </div>
                </div>
            </div>
            {/* <div>
                <em>Page is running in {import.meta.env.MODE}</em>
            </div> */}
        </footer>
    )
}