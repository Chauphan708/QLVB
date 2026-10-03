export {database} from './database';
export {sameOrigin} from './auth';
export {bucket} from './drive';
export function failure(e:unknown){console.error('Office operation failed',e instanceof Error?e.message:'Unknown error');return Response.json({error:'Không kết nối được kho dữ liệu. Kiểm tra cấu hình Supabase/Drive tại trang Kết nối hoặc thử lại.'},{status:503})}
