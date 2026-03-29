import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [state, setState] = useState({
    loading: true,
    message: "Verifying your email..."
  });

  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${token}`);
        setState({ loading: false, message: data.message });
      } catch (error) {
        setState({
          loading: false,
          message:
            error.response?.data?.message || "Verification failed. The link may be expired."
        });
      }
    };

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#121212]/95 p-8 text-center shadow-glow">
        <p className="text-sm uppercase tracking-[0.3em] text-highlight">Verification</p>
        <h1 className="mt-3 font-display text-3xl text-white">Email status</h1>
        <p className="mt-4 text-zinc-300">{state.message}</p>
        {!state.loading && (
          <Link
            to="/login"
            className="mt-8 inline-flex rounded-2xl bg-highlight px-5 py-3 font-semibold text-black"
          >
            Go to login
          </Link>
        )}
      </div>
    </div>
  );
}
