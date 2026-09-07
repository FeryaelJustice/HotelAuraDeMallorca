import { render } from '@testing-library/react';
import { CookiesProvider } from 'react-cookie';
import App from './App';
import './lang/i18n';

it("should render App without crashing", () => {
    const { container } = render(
        <CookiesProvider defaultSetOptions={{ path: '/' }}>
            <App />
        </CookiesProvider>
    );
    expect(container).toBeDefined();
});