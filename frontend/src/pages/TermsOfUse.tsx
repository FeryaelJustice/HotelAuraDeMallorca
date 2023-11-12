
import { useTranslation } from "react-i18next";

export const TermsOfUse = () => {
    const { t } = useTranslation();
    const termsOfUseHtml = { __html: t("termsOfUse")};
    return (
        <div dangerouslySetInnerHTML={termsOfUseHtml} style={{ padding:'20px' }}/>
    );
};
