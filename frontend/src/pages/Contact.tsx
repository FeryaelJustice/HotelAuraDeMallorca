import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";
import { useCookies } from 'react-cookie';
import BackgroundImage from './../assets/images/laptop-1920.webp';
import Swal from 'sweetalert2';

interface ContactProps {
    colorScheme: string,
}

export const Contact = ({ colorScheme }: ContactProps) => {
    // Dependencies
    const { t } = useTranslation();
    const [cookies, _, removeCookie] = useCookies(['token', 'refreshToken']);

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });

    const [email, setEmail] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [sendSuccess, setSendSuccess] = useState<boolean>(false)

    // Set logged user data for contact form
    useEffect(() => {
        if (cookies.token) {
            getAllLoggedUserData().then(res => {
                const userEmail = res?.data?.user_email || res?.user_email;
                if (userEmail) {
                    setEmail(userEmail);
                }
            }).catch(err => {
                console.error("Error loading logged user data:", err);
            });
        }
    }, [cookies.token]);

    const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
    };

    const handleSubjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSubject(event.target.value);
    };

    const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(event.target.value);
    };

    const isFormValid = () => {
        return email.trim() !== '' && subject.trim() !== '' && message.trim() !== '';
    };

    const handleReset = () => {
        setEmail('');
        setSubject('');
        setMessage('');
    }

    const handleSubmit = (event: any) => {
        event.preventDefault();

        const trimmedEmail = email.trim();
        const trimmedSubject = subject.trim();
        const trimmedMessage = message.trim();

        if (!trimmedEmail || !trimmedSubject || !trimmedMessage) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: t("contact_validation_error") || "Por favor, completa todos los campos requeridos.",
                confirmButtonColor: '#c5a059'
            });
            return;
        }

        Swal.fire({
            title: 'Enviando mensaje...',
            text: 'Por favor, espera un instante...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const data = {
            email: trimmedEmail,
            subject: trimmedSubject,
            message: trimmedMessage
        };

        serverAPI.post('/sendContactForm', data).then(response => {
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '¡Mensaje enviado!',
                text: response?.data?.message || t("contact_sent_success") || "¡Tu mensaje ha sido recibido con éxito!",
                confirmButtonColor: '#c5a059'
            });
            emptyForm();
        }).catch(error => {
            console.error("Error al enviar formulario de contacto:", error);
            Swal.close();
            const errorMsg = error?.response?.data?.message || error?.message || "No se pudo enviar el mensaje.";
            Swal.fire({
                icon: 'error',
                title: 'Error al enviar mensaje',
                text: errorMsg,
                confirmButtonColor: '#c5a059'
            });
        });
    }

    function emptyForm() {
        if (!cookies.token) {
            setEmail('');
        }
        setSubject('');
        setMessage('');
    }

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const loggedUserID = await serverAPI.post('/getLoggedUserID', { token: cookies.token }).catch(err => {
            console.log(err)
            removeCookie('token', { path: '/' });
            removeCookie('refreshToken', { path: '/' });
        });
        if (loggedUserID && loggedUserID.data && loggedUserID.data.userID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } }).catch(err => {
                removeCookie('token', { path: '/' });
                removeCookie('refreshToken', { path: '/' });
                console.log(err)
            });
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            }
        }
    }

    return (
        <div className='contactPage'>
            <div className='contactPageBg' style={{ backgroundImage: `url(${BackgroundImage})` }} />
            <div className='contactPageContent'>
                <Form id='contactForm' className='contactForm' onSubmit={handleSubmit}>
                    <h1 style={{ color: colorScheme === 'dark' ? '#FFFFFF' : '#0d6efd', marginBottom: '20px', fontSize: '2.2rem' }}>{t("contact_title")}</h1>

                    <Form.Group className="mb-3" controlId="email">
                        <Form.Label>{t("contact_email_label")}</Form.Label>
                        <Form.Control type="email" name='email' disabled={Boolean(cookies.token && email)} placeholder={t("contact_email_placeholder")} className='input' onChange={(event) => setEmail(event.target.value)} value={email} required />
                        <Form.Text className="text-muted">
                            {t("contact_email_description")}
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="subject">
                        <Form.Label>{t("contact_subject_label")}</Form.Label>
                        <Form.Control type="text" name='subject' maxLength={200} placeholder={t("contact_subject_placeholder")} className='input' onChange={(event) => setSubject(event.target.value)} value={subject} />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="message">
                        <Form.Label>{t("contact_message_label")}</Form.Label>
                        <Form.Control as='textarea' rows={8} name='message' maxLength={1000} placeholder={t("contact_message_placeholder")} className='input' onChange={(event) => setMessage(event.target.value)} value={message} />
                    </Form.Group>

                    <Button variant="primary" type="submit">
                        {t("contact_send")}
                    </Button>
                </Form>
            </div>
        </div>
    );
}