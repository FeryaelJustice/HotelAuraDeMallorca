import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";
import { useCookies } from 'react-cookie';
import BackgroundImage from './../assets/images/laptop-1920.webp'

interface ContactProps {
    colorScheme: string,
}

export const Contact = ({ colorScheme }: ContactProps) => {
    // Dependencies
    const { t } = useTranslation();
    const [cookies, _, removeCookie] = useCookies(['token']);

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });

    console.log(colorScheme)

    const [email, setEmail] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (cookies.token) {
            getAllLoggedUserData().then((data) => {
                setEmail(data.data.user_email)
            }).catch((error) => { console.log(error); });
        }
    }, []);

    const handleSubmit = (event: any) => {
        event.preventDefault();

        const data = {
            email,
            subject,
            message
        }
        serverAPI.post('/sendContactForm', data).then(response => {
            alert(response.data.msg)
            emptyForm();
        }).catch(error => {
            console.log(error)
            if (error.response.data && error.response.data.msg) {
                alert(error.response.data.msg)
            }
        })
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
            removeCookie('token');
        });
        if (loggedUserID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } }).catch(err => {
                removeCookie('token')
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
                    <h1>{t("contact_title")}</h1>
                    <Form.Group className="mb-3" controlId="email">
                        <Form.Label>{t("contact_email_label")}</Form.Label>
                        <Form.Control type="email" name='email' disabled={cookies.token} placeholder={t("contact_email_placeholder")} className='input' onChange={(event) => setEmail(event.target.value)} value={email} />
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