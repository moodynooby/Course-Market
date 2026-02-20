import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // App renders either login page or loading indicator or redirect
    expect(document.body).toBeInTheDocument();
  });
});
