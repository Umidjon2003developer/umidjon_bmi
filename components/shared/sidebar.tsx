'use client'

import { Button } from '@/components/ui/button'
import { adminNavLinks, instructorNavLinks, profileNavLinks } from '@/constants'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
	page: 'admin' | 'instructor' | 'user'
}
function Sidebar({ page }: Props) {
	const pathname = usePathname()

	const getNavLinks = () => {
		if (page === 'admin') {
			return adminNavLinks
		} else if (page === 'instructor') {
			return instructorNavLinks
		} else {
			return profileNavLinks
		}
	}

	return (
		<div className='fixed inset-0 mt-[10vh] h-[90vh] w-[300px]'>
			<div className='container mt-6'>
				<div className='flex flex-col space-y-3'>
					{getNavLinks().map(item => (
						<Link key={item.route} href={item.route}>
							<Button
								className='flex w-full justify-start gap-2'
								variant={
									pathname.slice(3) === item.route ? 'secondary' : 'ghost'
								}
							>
								<item.icon className='size-5 text-muted-foreground' />
								<span>{item.label}</span>
							</Button>
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}

export default Sidebar
