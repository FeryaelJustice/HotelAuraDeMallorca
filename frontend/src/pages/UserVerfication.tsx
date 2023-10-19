import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';

export const UserVerification = () => {
    const { token } = useParams();
    const [verificationStatus, setVerificationStatus] = useState('');

    useEffect(() => {
        axios.post(`${API_URL}/api/user/verifyEmail/${token}`)
            .then(response => {
                setVerificationStatus(response.data.status);
            })
            .catch(error => {
                console.error('Error verifying email:', error);
                setVerificationStatus('error');
            });
    }, [token]);

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