export type Accessory = { id: string; name: string; price: string };
export type Quote = {
  vehicle: {
    make: string;
    model: string;
    category: string;
    seating_capacity: number | null;
    image_url: string;
    price_note: string;
  };
  currency: string;
  vehicle_price: string;
  registration_estimate: string;
  insurance_estimate: string;
  accessories: Accessory[];
  total: string;
  estimate_note: string;
};
export type Order = {
  reference: string;
  created_at: string;
  buyer_name: string;
  customer_email: string;
  city: string;
  summary: Quote;
  payment_status: string;
};
export type Enquiry = {
  id: number;
  vehicle_name: string;
  name: string;
  phone: string;
  city: string;
  preferred_date: string;
  status: string;
};
