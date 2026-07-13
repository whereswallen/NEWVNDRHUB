import { AuthForm } from "@/components/auth-form";
export default async function SignInPage({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;return <AuthForm mode="sign-in" next={next}/>}
