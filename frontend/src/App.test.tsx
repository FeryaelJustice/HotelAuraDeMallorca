import { render, screen } from '@testing-library/react';
import App from './App';

it("should have hello world", () => {
    render(<App />)
    const msg = screen.queryByText(/Hello World/i)
    expect(msg).toBeDefined();
})