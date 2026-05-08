import { getDestinationOptions } from "@/services/destination.service";
import { Navbar } from "./Navbar";

export async function NavbarWrapper() {
  const destinations = await getDestinationOptions().catch(() => []);
  return <Navbar destinations={destinations} />;
}
