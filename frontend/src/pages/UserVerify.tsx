import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import serverAPI from './../services/serverAPI';

interface UserVerifyProps {
    colorScheme: string,
}

export const UserVerify = ({ colorScheme }: UserVerifyProps) => {

    // Dependencies
    const navigate = useNavigate();
    const [cookies, setCookie, _] = useCookies(['token', 'cookieConsent']);

    const { token } = useParams();
    const [verificationStatus, setVerificationStatus] = useState('');

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    console.log(colorScheme)
    
    useEffect(() => {
        if (cookies.cookieConsent) {
        serverAPI.post(`user/verifyEmail/${token}`)
            .then(response => {
                setVerificationStatus(response.data.status);
                if (cookies.cookieConsent) {
                    setCookie('token', response.data.jwt)
                    navigate("/")
                } else {
                    alert("You didn't consent to use cookies, couldn't verify email")
                }
            })
            .catch(error => {
                console.error('Error verifying email:', error);
                setVerificationStatus('error');
            });
        } else {
            alert("You didn't consent to use cookies, couldn't verify email")
            navigate("/")
        }
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