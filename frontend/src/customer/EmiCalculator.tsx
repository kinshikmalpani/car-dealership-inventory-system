import { useState } from "react";
import { money } from "../api";
import { calculateEmi } from "./finance";
export function EmiCalculator({ price = 800000 }: { price?: number }) {
  const [amount, setAmount] = useState(price);
  const [down, setDown] = useState(Math.round(price * 0.2));
  const [rate, setRate] = useState(9);
  const [years, setYears] = useState(5);
  const principal = Math.max(0, amount - down);
  const emi = calculateEmi(principal, rate, years * 12);
  const valid =
    Number.isFinite(amount + down + rate + years) &&
    amount > 0 &&
    down >= 0 &&
    down <= amount &&
    rate >= 0 &&
    rate <= 30 &&
    years >= 1 &&
    years <= 10;
  return (
    <section className="content-panel emi-panel">
      <div>
        <p className="eyebrow">PLAN AT YOUR OWN PACE</p>
        <h2>Make room in your budget.</h2>
        <p className="muted">
          Explore an indicative reducing-balance EMI. Change the rate to match
          your lender’s quote.
        </p>
      </div>
      <div className="emi-fields">
        <label>
          Car budget (₹)
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label>
          Down payment (₹)
          <input
            type="number"
            min="0"
            max={amount}
            value={down}
            onChange={(e) => setDown(Number(e.target.value))}
          />
        </label>
        <label>
          Annual interest (%)
          <input
            type="number"
            min="0"
            max="30"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </label>
        <label>
          Loan tenure (years)
          <input
            type="number"
            min="1"
            max="10"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </label>
      </div>
      {valid ? (
        <div className="emi-result">
          <p>Estimated monthly EMI</p>
          <strong>{money(emi)}</strong>
          <p>
            Loan amount {money(principal)} · Total interest{" "}
            {money(Math.max(0, emi * years * 12 - principal))}
          </p>
        </div>
      ) : (
        <p role="alert">
          Enter valid amounts; down payment cannot exceed your budget.
        </p>
      )}
      <p className="fine-print">
        Planning tool only. The 9% starting rate is an editable assumption, not
        a loan offer. Processing fees and lender eligibility are not included.
      </p>
    </section>
  );
}
