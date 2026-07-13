import type {Metadata} from "next"; import "./globals.css";
export const metadata:Metadata={title:"VNDR Hub",description:"Production consignment retail platform"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
