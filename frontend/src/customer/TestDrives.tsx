import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../api";
import { Modal } from "../Modal";
import { Feedback, useData } from "./shared";
import type { Enquiry } from "./types";

export function TestDriveForm({
  id,
  name,
  token,
  onClose,
}: {
  id: number;
  name: string;
  token: string;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    try {
      await api("/test-drives", token, {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: id,
          name: fields.get("name"),
          phone: fields.get("phone"),
          city: fields.get("city"),
          preferred_date: fields.get("date"),
        }),
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={done ? "Enquiry received" : "Experience it for yourself"}
      busy={busy}
      onClose={onClose}
    >
      {done ? (
        <>
          <p className="muted">
            Your enquiry is saved for the dealership to review. A time is not
            confirmed until the team contacts you.
          </p>
          <a className="primary" href="#/test-drives" onClick={onClose}>
            View my enquiries
          </a>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="modal-vehicle">{name}</p>
          <Feedback error={error} />
          <fieldset disabled={busy}>
            <label>
              Your name
              <input name="name" required maxLength={100} autoComplete="name" />
            </label>
            <label>
              Indian mobile number
              <input
                name="phone"
                inputMode="tel"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                required
                placeholder="10-digit mobile number"
              />
            </label>
            <label>
              City
              <input name="city" required maxLength={100} />
            </label>
            <label>
              Preferred date
              <input
                name="date"
                type="date"
                required
                min={new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Kolkata",
                })}
              />
            </label>
            <p className="fine-print">
              This sends an enquiry to the dealership dashboard. It does not
              confirm an appointment or send an SMS.
            </p>
            <button className="primary full">
              {busy ? "Sending…" : "Request a test drive"}
            </button>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}

export function TestDrives({
  token,
  admin = false,
}: {
  token: string;
  admin?: boolean;
}) {
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const resource = useData<Enquiry[]>(
    admin ? "/admin/test-drives" : "/test-drives",
    token,
    revision,
  );
  async function update(id: number, status: string) {
    try {
      await api(`/admin/test-drives/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setRevision((x) => x + 1);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <>
      <div className="section-heading">
        <p className="eyebrow">GET TO KNOW YOUR NEXT CAR</p>
        <h1>{admin ? "Test-drive enquiries" : "Your test-drive enquiries"}</h1>
        <p>
          Enquiries are requests. The dealership confirms availability and
          timing separately.
        </p>
      </div>
      <Feedback loading={resource.loading} error={error || resource.error} />
      {resource.data?.length === 0 && (
        <div className="empty-state">
          <h2>No enquiries yet</h2>
          <p>Open a car’s details to request a test drive.</p>
        </div>
      )}
      <div className="enquiry-grid">
        {resource.data?.map((item) => (
          <article className="content-panel" key={item.id}>
            <span className="status-pill">{item.status}</span>
            <h2>{item.vehicle_name}</h2>
            <p>
              {item.preferred_date} · {item.city}
            </p>
            {admin && (
              <>
                <p>
                  {item.name} · {item.phone}
                </p>
                <label>
                  Enquiry status
                  <select
                    value={item.status}
                    onChange={(e) => update(item.id, e.target.value)}
                  >
                    {["requested", "contacted", "scheduled", "closed"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      ),
                    )}
                  </select>
                </label>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
