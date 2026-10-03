import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Văn thư · Quản lý văn bản trường học',description:'Quản lý văn bản đến, văn bản đi, hồ sơ đính kèm và tiến độ xử lý của nhà trường.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}

