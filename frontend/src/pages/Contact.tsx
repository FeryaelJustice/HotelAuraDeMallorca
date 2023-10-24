import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import axios from 'axios'
const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';

export const Contact = () => {

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
        axios.post(API_URL + '/api/sendContactForm', data).then(response => {
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
            <h1>Contact us!</h1>
            <Form className='contactForm' onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control type="email" name='email' placeholder="Enter email" className='input' onChange={(event) => setEmail(event.target.value)} />
                    <Form.Text className="text-muted">
                        We'll never share your email with anyone else.
                    </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="subject">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control type="text" name='subject' maxLength={200} placeholder="Subject" className='input' onChange={(event) => setSubject(event.target.value)} />
                </Form.Group>

                <Form.Group className="mb-3" controlId="message">
                    <Form.Label>Message</Form.Label>
                    <Form.Control as='textarea' rows={8} name='message' maxLength={1000} placeholder="Message" className='input' onChange={(event) => setMessage(event.target.value)} />
                </Form.Group>

                <Button variant="primary" type="submit">
                    Submit
                </Button>
            </Form>
        </div>
    );
}