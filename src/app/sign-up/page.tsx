import { AuthForm } from "@/components/auth-form";
export default async function SignUpPage({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;return <AuthForm mode="sign-up" next={next}/>}
