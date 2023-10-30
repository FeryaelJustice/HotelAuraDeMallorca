import { useEffect } from 'react'
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
    const navigate = useNavigate();
    const [cookies] = useCookies(['token']);

    useEffect(() => {
        if (!cookies.token) {
            navigate("/")
        }
    }, [])

    return (
        <div>
            Admin Page
        </div>
    );
}