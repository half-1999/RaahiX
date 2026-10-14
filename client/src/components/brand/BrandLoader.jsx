import Logo from './Logo';

export default function BrandLoader({ label = 'Loading RaahiX' }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f7f6f3] px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <Logo size="lg" />
        <span className="rx-loader mt-6" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
