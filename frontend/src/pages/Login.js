import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page py-3">
      <div className="container">
        <div className="auth-container">
          <div className="card auth-card">
            <div className="text-center mb-2">
              <FaSignInAlt size={48} color="#4F46E5" />
              <h2>Login to BuyEasy</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-links mt-2 text-center">
              <p>
                Don't have an account?{' '}
                <Link to="/register">Register here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          max-width: 450px;
          margin: 0 auto;
        }

        .auth-card {
          padding: 40px;
        }

        .auth-links a {
          color: var(--primary-color);
          text-decoration: none;
          font-weight: 600;
        }

        .auth-links a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default Login;
