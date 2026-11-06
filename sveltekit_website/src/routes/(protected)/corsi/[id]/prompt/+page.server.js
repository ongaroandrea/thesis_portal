import { redirect } from '@sveltejs/kit';
import { courseService } from '$lib/server/services/course.service.js';

export async function load({ params, locals }) {
	try {
		await courseService.requireCourseManager(params.id, locals.user);
	} catch {
		redirect(303, `/corsi/${params.id}`);
	}
}
