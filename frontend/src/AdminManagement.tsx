import { Purchases, PurchaseDetail } from "./customer/Purchases";
import { TestDrives } from "./customer/TestDrives";
import { Feedback, useData } from "./customer/shared";
export function AdminManagement({
  token,
  route,
}: {
  token: string;
  route: string;
}) {
  const order = route.match(/^\/orders\/(.+)$/);
  if (order) return <PurchaseDetail reference={order[1]} token={token} />;
  if (route.includes("test-drives")) return <TestDrives token={token} admin />;
  if (route.includes("customers")) return <Customers token={token} />;
  return <Purchases token={token} admin />;
}
function Customers({ token }: { token: string }) {
  const { data, error, loading } = useData<
    { id: number; email: string; purchase_count: number }[]
  >("/admin/customers", token);
  return (
    <>
      <div className="section-heading">
        <p className="eyebrow">CUSTOMER MANAGEMENT</p>
        <h1>Your customers</h1>
        <p>Registered customer accounts and their confirmed purchase counts.</p>
      </div>
      <Feedback loading={loading} error={error} />
      <div className="content-panel table-scroll">
        <table className="customer-table">
          <thead>
            <tr>
              <th>Customer email</th>
              <th>Purchases</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.email}</td>
                <td>{customer.purchase_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p>No customers have registered yet.</p>}
      </div>
    </>
  );
}
