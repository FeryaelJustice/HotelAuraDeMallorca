
import { useTranslation } from "react-i18next";

export const PrivacyPolicy = () => {
    const { t } = useTranslation();
    const privacyPolicyHtml = { __html: t("privacyPolicy")};
    return (
        <div dangerouslySetInnerHTML={privacyPolicyHtml} style={{ padding:'20px' }}/>
    );
};
