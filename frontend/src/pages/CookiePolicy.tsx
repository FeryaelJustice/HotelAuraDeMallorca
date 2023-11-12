
import { useTranslation } from "react-i18next";

export const CookiePolicy = () => {
    const { t } = useTranslation();
    const cookiePolicyHtml = { __html: t("cookiePolicy")};
    return (
        <div dangerouslySetInnerHTML={cookiePolicyHtml} style={{ padding:'20px' }}/>
    );
};
