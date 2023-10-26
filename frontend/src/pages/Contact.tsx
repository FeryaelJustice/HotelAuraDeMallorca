import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";

export const Contact = () => {
    const { t } = useTranslation();

    const [email, setEmail] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')

    const handleSubmit = (event: any) => {
        event.preventDefault();

        const data = {
            email,
            subject,
            message
        }
        serverAPI.post('/api/sendContactForm', data).then(response => {
            alert(response.data.msg)
        }).catch(error => {
            console.error(error)
            if (error.response.data && error.response.data.msg) {
                alert(error.response.data.msg)
            }
        })
    }

    return (
        <div className='contactPage'>
            <h1>{t("contact_title")}</h1>
            <Form className='contactForm' onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                    <Form.Label>{t("contact_email_label")}</Form.Label>
                    <Form.Control type="email" name='email' placeholder={t("contact_email_placeholder")} className='input' onChange={(event) => setEmail(event.target.value)} />
                    <Form.Text className="text-muted">
                        {t("contact_email_description")}
                    </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="subject">
                    <Form.Label>{t("contact_subject_label")}</Form.Label>
                    <Form.Control type="text" name='subject' maxLength={200} placeholder={t("contact_subject_placeholder")} className='input' onChange={(event) => setSubject(event.target.value)} />
                </Form.Group>

                <Form.Group className="mb-3" controlId="message">
                    <Form.Label>{t("contact_message_label")}</Form.Label>
                    <Form.Control as='textarea' rows={8} name='message' maxLength={1000} placeholder={t("contact_message_placeholder")} className='input' onChange={(event) => setMessage(event.target.value)} />
                </Form.Group>

                <Button variant="primary" type="submit">
                    {t("contact_send")}
                </Button>
            </Form>
        </div>
    );
}