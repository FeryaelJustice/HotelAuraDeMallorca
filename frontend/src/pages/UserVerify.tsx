import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCookies } from 'react-cookie';
const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';
// const FRONT_URL = process.env.FRONT_URL ? process.env.FRONT_URL : 'http://localhost:5173';

export const UserVerify = () => {
    const navigate = useNavigate();
    const [, setCookie, ] = useCookies(['token']);

    const { token } = useParams();
    const [verificationStatus, setVerificationStatus] = useState('');

    useEffect(() => {
        axios.post(`${API_URL}/api/user/verifyEmail/${token}`)
            .then(response => {
                setVerificationStatus(response.data.status);
                setCookie('token', response.data.jwt)
                navigate("/")
            })
            .catch(error => {
                console.error('Error verifying email:', error);
                setVerificationStatus('error');
            });
    }, []);

    useEffect(() => {
        // Redirect to a different page after verification
        if (verificationStatus === 'success') {
            // Redirect to the booking page or any other page
            // history.push('/booking');
        }
    }, [verificationStatus]); // , history

    return (
        <div>
            {verificationStatus === 'success' && <p>Email verified successfully!</p>}
            {verificationStatus === 'error' && <p>Error verifying email. Please try again.</p>}
            {/* You can add more UI based on the verification status */}
        </div>
    );
};