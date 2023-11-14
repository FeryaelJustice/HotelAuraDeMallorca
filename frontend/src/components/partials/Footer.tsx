import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom"

interface FooterProps {
    colorScheme: string,
}

export const Footer = ({ colorScheme }: FooterProps) => {
    const { t } = useTranslation();
    return (
        <footer id="footer" className="footer" style={{backgroundColor: colorScheme == 'dark' ? '#FFFFFF' : '#000000', color: colorScheme == 'dark' ? '#000000' : '#FFFFFF'}}>
            <div className="footer-sides">
                <div className="footer-left">
                    <u><strong>{process.env.APP_NAME}</strong></u>
                    <p>{t("footer_description")}</p>
                </div>
                <div className="footer-right">
                    <span>Tlf: <a style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB'}} href="tel:123456789">{t("footer_callus")}</a></span>
                    <span>Whatsapp: <a style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB' }} href="https://api.whatsapp.com/send?phone=123456789">{t("footer_sendmsg")}</a> </span>
                    <span>Email: <a style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB' }} href="mailto:hotelaurademallorca@aurademallorca.com">{t("footer_contact")}</a></span>
                    <div className="footer-right-legal">
                        <span><NavLink style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB' }} to="/privacy-policy">{t("privacyPolicy_title")}</NavLink></span>
                        <span><NavLink style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB' }} to="/legal-notice">{t("legalNotice_title")}</NavLink></span>
                        <span><NavLink style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB' }} to="/cookies-policy">{t("cookiePolicy_title")}</NavLink></span>
                        <span><NavLink style={{ color: colorScheme == "light" ? '#FF7A7A' : '#002FEB' }} to="/terms-of-use">{t("termsOfUse_title")}</NavLink></span>
                    </div>
                </div>
            </div>
            {/* <div>
                <em>Page is running in {import.meta.env.MODE}</em>
            </div> */}
        </footer>
    )
}