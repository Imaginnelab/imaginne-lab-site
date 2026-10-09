import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import '@/styles/process.css';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['home']['process']  };

export function Process({ anchors, copy }: Props) {
  return (
    <section className="section journey" id={anchors.process} data-process="" aria-labelledby="journey-heading">
      <div className="wrap">
        <header className="journey-header">
          <p className="journey-badge">
            {copy.text001}
          </p>
          <h2 id="journey-heading">
            {copy.text002}
            <br />
            <span>
              {copy.text003}
            </span>
          </h2>
          <p>
            {copy.text004}
          </p>
        </header>
        <div className="journey-track" data-process-track="">
          <div className="journey-spine" data-process-spine="" aria-hidden="true">
            <span className="journey-spine-fill" data-process-fill="">
            </span>
          </div>
          <ol className="journey-steps">
            <li className="journey-step" data-process-step="">
              <span className="journey-point" data-process-point="" aria-hidden="true">
              </span>
              <div className="journey-copy">
                <p className="journey-kicker">
                  <span className="journey-number" aria-hidden="true">
                    {copy.text005}
                  </span>
                  {copy.text006}
                </p>
                <h3>
                  {copy.text007}{' '}
                  <span>
                    {copy.text008}
                  </span>
                </h3>
                <p className="journey-description">
                  {copy.text009}
                </p>
                <ul className="journey-checklist">
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text010}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text011}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text012}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="journey-stage journey-stage-1" aria-hidden="true" inert={true}>
                <div className="journey-chat">
                  <div className="journey-chat-brand">
                    <span className="journey-avatar">
                      {copy.text013}
                    </span>
                    <span>
                      {copy.text014}
                    </span>
                    <span className="journey-online">
                    </span>
                  </div>
                  <p className="journey-bubble journey-bubble-out journey-beat-1">
                    {copy.text015}
                  </p>
                  <p className="journey-bubble journey-beat-2">
                    {copy.text016}
                  </p>
                  <div className="journey-attachment journey-beat-3">
                    <svg viewBox="0 0 180 156" aria-hidden="true">
                      <path d="M74 28h32l-7 27 21 53-8 30H68l-8-30 21-53z">
                      </path>
                      <path d="m74 28 25 27M81 55h18m-39 53h60m-52 30 13-83m31 83L99 55">
                      </path>
                    </svg>
                    <span>
                      {copy.text017}
                    </span>
                  </div>
                  <p className="journey-confirm journey-beat-4">
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    {copy.text018}
                  </p>
                </div>
              </div>
            </li>
            <li className="journey-step" data-process-step="">
              <span className="journey-point" data-process-point="" aria-hidden="true">
              </span>
              <div className="journey-copy">
                <p className="journey-kicker">
                  <span className="journey-number" aria-hidden="true">
                    {copy.text019}
                  </span>
                  {copy.text020}
                </p>
                <h3>
                  {copy.text021}{' '}
                  <span>
                    {copy.text022}
                  </span>
                </h3>
                <p className="journey-description">
                  {copy.text023}
                </p>
                <ul className="journey-checklist">
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text024}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text025}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text026}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="journey-stage journey-stage-2" aria-hidden="true" inert={true}>
                <div className="journey-design">
                  <p className="journey-scene-label">
                    {copy.text027}
                  </p>
                  <div className="journey-model-grid">
                    <svg className="journey-wireframe" viewBox="0 0 180 156" aria-hidden="true">
                      <g>
                        <path d="M74 28h32l-7 27 21 53-8 30H68l-8-30 21-53z">
                        </path>
                        <path d="M74 28h32M81 55h18m-39 53h60m-52 30h44M74 28l25 27M106 28 81 55m-13 83 13-83m31 83L99 55m-39 53 39-53m21 53L81 55M68 138l52-30m-8 30-52-30">
                        </path>
                      </g>
                    </svg>
                  </div>
                  <div className="journey-chips">
                    <span className="journey-chip journey-chip-size">
                      {copy.text028}{' '}
                      <span className="journey-size-before">
                        {copy.text029}
                      </span>
                      <span className="journey-size-after">
                        {copy.text030}
                      </span>
                    </span>
                    <span className="journey-chip">
                      {copy.text031}
                      <span className="journey-color-dot">
                      </span>
                    </span>
                  </div>
                  <p className="journey-confirm journey-beat-4">
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    {copy.text032}
                  </p>
                </div>
              </div>
            </li>
            <li className="journey-step" data-process-step="">
              <span className="journey-point" data-process-point="" aria-hidden="true">
              </span>
              <div className="journey-copy">
                <p className="journey-kicker">
                  <span className="journey-number" aria-hidden="true">
                    {copy.text033}
                  </span>
                  {copy.text034}
                </p>
                <h3>
                  {copy.text035}{' '}
                  <span>
                    {copy.text036}
                  </span>
                </h3>
                <p className="journey-description">
                  {copy.text037}
                </p>
                <ul className="journey-checklist">
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text038}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text039}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text040}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="journey-stage journey-stage-3" aria-hidden="true" inert={true}>
                <div className="journey-print">
                  <p className="journey-scene-label">
                    {copy.text041}
                  </p>
                  <svg className="journey-printer" viewBox="0 0 280 200" aria-hidden="true">
                    <path className="journey-printer-frame" d="M34 176V24h212v152M34 38h212M24 177h232">
                    </path>
                    <g className="journey-print-layers">
                      <path className="journey-layer-0" d="M108 169h64">
                      </path>
                      <path className="journey-layer-1" d="M106 161h68">
                      </path>
                      <path className="journey-layer-2" d="M104 153h72">
                      </path>
                      <path className="journey-layer-3" d="M106 145h68">
                      </path>
                      <path className="journey-layer-4" d="M109 137h62">
                      </path>
                      <path className="journey-layer-5" d="M112 129h56">
                      </path>
                      <path className="journey-layer-6" d="M115 121h50">
                      </path>
                      <path className="journey-layer-7" d="M118 113h44">
                      </path>
                      <path className="journey-layer-8" d="M121 105h38">
                      </path>
                      <path className="journey-layer-9" d="M124 97h32">
                      </path>
                      <path className="journey-layer-10" d="M126 89h28">
                      </path>
                      <path className="journey-layer-11" d="M126 81h28">
                      </path>
                    </g>
                    <g className="journey-print-nozzle">
                      <path d="M124 39h32v15h-32zM132 54h16l-8 12z">
                      </path>
                      <path d="M140 24v15">
                      </path>
                    </g>
                  </svg>
                  <div className="journey-print-status">
                    <span>
                      {copy.text042}
                    </span>
                    <span className="journey-percent">
                      <span className="journey-percent-0">
                        {copy.text043}
                      </span>
                      <span className="journey-percent-35">
                        {copy.text044}
                      </span>
                      <span className="journey-percent-70">
                        {copy.text045}
                      </span>
                      <span className="journey-percent-100">
                        {copy.text046}
                      </span>
                    </span>
                  </div>
                  <div className="journey-progress">
                    <span>
                    </span>
                  </div>
                  <p className="journey-confirm journey-beat-4">
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    {copy.text047}
                  </p>
                </div>
              </div>
            </li>
            <li className="journey-step" data-process-step="">
              <span className="journey-point" data-process-point="" aria-hidden="true">
              </span>
              <div className="journey-copy">
                <p className="journey-kicker">
                  <span className="journey-number" aria-hidden="true">
                    {copy.text048}
                  </span>
                  {copy.text049}
                </p>
                <h3>
                  {copy.text050}{' '}
                  <span>
                    {copy.text051}
                  </span>
                </h3>
                <p className="journey-description">
                  {copy.text052}
                </p>
                <ul className="journey-checklist">
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text053}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text054}
                    </span>
                  </li>
                  <li>
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    <span>
                      {copy.text055}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="journey-stage journey-stage-4" aria-hidden="true" inert={true}>
                <div className="journey-delivery">
                  <p className="journey-scene-label">
                    {copy.text056}
                  </p>
                  <div className="journey-parcel">
                    <svg viewBox="0 0 240 180" aria-hidden="true">
                      <path className="journey-box-side" d="m38 63 82 40v66l-82-41z">
                      </path>
                      <path className="journey-box-front" d="m120 103 82-40v65l-82 41z">
                      </path>
                      <g className="journey-box-lid">
                        <path d="m38 63 82-40 82 40-82 40z">
                        </path>
                        <path className="journey-box-tape" d="m107 29 26-1 69 35-25 12z">
                        </path>
                      </g>
                      <g className="journey-box-label">
                        <path d="m145 110 34-17v25l-34 17z">
                        </path>
                        <path d="m151 113 22-11m-22 18 17-8">
                        </path>
                      </g>
                    </svg>
                    <span className="journey-parcel-label">
                      {copy.text057}
                    </span>
                  </div>
                  <p className="journey-confirm journey-beat-4">
                    <svg className="journey-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6">
                      </path>
                    </svg>
                    {copy.text058}
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
