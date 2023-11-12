
import { useTranslation } from "react-i18next";

export const LegalNotice = () => {
    const { t } = useTranslation();
    const legalNoticeHtml = { __html: t("legalNotice")};
    return (
        <div dangerouslySetInnerHTML={legalNoticeHtml} style={{ padding:'20px' }}/>
    );
};
