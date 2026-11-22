import { Component, type ReactNode } from "react";

// Evita la pantalla en blanco si una vista falla al renderizar: muestra el error y permite volver.
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="rounded-2xl border border-[#743b49] bg-[#321c28] p-5 text-sm text-danger">
        <b className="block text-base text-white">Algo ha fallado en esta pantalla</b>
        <p className="mt-2 break-words font-mono text-xs opacity-80">{this.state.error.message}</p>
        <a href="/" className="mt-4 inline-block rounded-lg bg-violet px-4 py-2 font-semibold text-white">Volver al inicio</a>
      </div>
    );
  }
}
