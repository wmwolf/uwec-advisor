// HTML helpers
const context_classes = ['light', 'default', 'primary', 'secondary', 'success', 'warning', 'danger', 'thick'];
const text_bg_classes = context_classes.map(cls => `text-bg-${cls}`);
const border_classes = context_classes.map(cls => `border-${cls}`);
const btn_classes = context_classes.map(cls => `btn-${cls}`);

// Javascript Class to handle Courses

// TODO:
// - Should Course be smart enough to be able to figure out if it is available?
//    It would need to know a term and a list of other courses so it can find
//    its requirements.
// - Courses can now advertise if they are required or not along the footer
//     (along with LE and SL stats). However, what is required will be stored
//     in the course plan so this will really only be set by a course plan.
//     Perhaps we have several available notes that better explain what a
//     course is there for? These could be
//     - Required (explicitly required by major)
//     - Option: Unmet (one of several options to fulfill an unmet requirement)
//     - Option: Met (one of several options to fulfill an already-met requirement)
//     - Excluded (an elective/option that has been excluded by another course)
//     - Prerequisite
//     - Corequisite
//     - Elective
//     - Elective Support (Requirement for an elective)
// - How will it work?
//     CoursePlan class will include listeners on every completed/enrolling
//     switch as well as the term selector. Upon clicking any, it will
//     re-determine the status of all courses (unavailable, available,
//     enrolling, or completed) as well as the note
//
//     Would like to be able to include multiple course plans... can each act
//     independently? Or would we need to combine logic?
// - UI Elements
//     Flyover menus for details on course plans, course plan progress, LE
//     progress?

class Course {
	constructor(data) {
		// this is meant to be autogenerated from a JSON object with many required
		// fields that should probably be documented here, but currently aren't.
		for (const key in data) {
			if (data.hasOwnProperty(key)) {
				this[key] = data[key];
			}
		}
		this.card_id = `${this.field}${this.number}`;
		this.modal_id = `${this.field}-${this.number}`;
		this.completed_id = `${this.field}-${this.number}-completed`;
		this.enrolling_id = `${this.field}-${this.number}-enrolling`;

		// State
		this.completed = false;
		this.enrolling = false;
		this.available = false;
		this.required = false;
		this.enroll_term = null;
	}
	card_html() {
		let res = `<div class="col"><div class='card' id='${this.card_id}'>\n`;
		res += `  <h5 class='card-header text-bg-light'>${this.field} ${this.number} <span class='fst-italic'>(${this.credits} credits)</span></h5>\n`;
		res += "  <div class='card-body'>\n";
		res += `    <h5 class='card-title'>${this.name}</h5>\n`;
		res += "    <div class='row'>\n";
		res += "      <div class='col-5'>\n";
		res += `        <button type='button' class='btn btn-lg btn-light description' id='${this.modal_id}' data-bs-toggle='modal' data-bs-target='#course-info'>Details</button>\n`;
		res += '     </div>\n';
		res += "      <div class='col-7 px-1'>\n";
		res += "        <div class='form-check form-switch'>\n";
		res += `          <input type='checkbox' class='form-check-input completed' role='switch' id='${this.completed_id}'>\n`;
		res += `          <label class="form-check-label" for='${this.completed_id}' class='custom-control-label'>Completed</label>\n`;
		res += '        </div>\n';
		res += "        <div class='form-check form-switch'>\n";
		res += `          <input type='checkbox' class='form-check-input enrolling' role='switch' id='${this.enrolling_id}'>\n`;
		res += `          <label class="form-check-label" for='${this.enrolling_id}' class='custom-control-label'>Enrolling</label>\n`;
		res += '        </div>\n';
		res += '      </div>\n';
		res += '    </div>\n';

		res += '  </div>\n';
		res += "  <div class='card-footer'><div class='d-flex justify-content-between'>\n";
		res += "    <span class='fw-bold status'></span>\n";
		res += "    <span class='le'>\n";
		this.le.forEach(elt => {
			if (['K1', 'K2', 'K3', 'K4', 'K1L', 'K2L'].includes(elt)) {
				res += `      <span class="badge text-bg-secondary">${elt}</span>\n`;
			} else if (['S1', 'S1W', 'S2', 'S3'].includes(elt)) {
				res += `      <span class="badge text-bg-light">${elt}</span>\n`;
			}
		});
		res += '    </span>\n';
		res += '  </div></div>\n';
		res += '</div></div>\n';
		return res;
	}

	update_modal() {
		document.querySelector('#course-info-label').innerHTML = `${this.field} ${this.number}: ${this.name}`;
		document.querySelector('#course-description').innerHTML = '';
		document.querySelector('#course-description').innerHTML += `<p>${this.description}</p>`;
		document.querySelector('#course-description').innerHTML += `<p>Lecture Hours: ${this.lecture_hours}; Lab Hours: ${this.lab_hours}</p>`;
		if (this.requirements) {
			const reqs = this.requirements;
			if (reqs.prereqs && reqs.prereqs.length > 0) {
				document.querySelector('#course-description').innerHTML += `<p><span class='fst-italic'>Prerequisites:</span> ${reqs.prereqs.join(', ')}</p>`;
			}
			if (reqs.coreqs && reqs.coreqs.length > 0) {
				document.querySelector('#course-description').innerHTML += `<p><span class='fst-italic'>Corequisites:</span> ${reqs.coreqs.join(', ')}</p>`;
			}
			if (reqs.combo && reqs.combo.length > 0) {
				document.querySelector('#course-description').innerHTML += `<p><span class='fst-italic'>Must have taken at least ${reqs.combo.min} of:</span> ${this.requirements.combo.options.join(', ')}</p>`;
			}
			if (reqs.exclude && reqs.exclude.length > 0) {
				document.querySelector('#course-description').innerHTML += `<p><span class='fst-italic'>No credit if taken with/after:</span> ${reqs.exclude.join(', ')}</p>`;
			}
		}
		let availability = 'Offered ';
		if (this.terms_offered == 'all') {
			availability += 'every term.';
		} else if (this.years_offered == 'all') {
			availability += `in the <span class='font-weight-bold'>${this.terms_offered} term</span> every year.`;
		} else {
			availability += `in the <span class='font-weight-bold'>${this.terms_offered} term of ${this.years_offered} years</span>.`;
		}
		document.querySelector('#course-description').innerHTML += `<p>${availability}</p>`;
		// $('#modal-enrolling').prop('disabled', !@available(year_term) || @completed)
	}

	mark_generic(context, shadow, status) {
		const card_sel = document.querySelector(`#${this.card_id}`);
		const header_sel = document.querySelector(`#${this.card_id} .card-header`);
		const body_sel = document.querySelector(`#${this.card_id} .card-body`);
		const footer_sel = document.querySelector(`#${this.card_id} .card-footer`);
		const btn_sel = document.querySelector(`#${this.card_id} .btn`);
		const status_sel = document.querySelector(`#${this.card_id} span.status`);

		// only change context classes if one is provided
		if (context) {
			// Go to basic styles by removing a bunch of classes
			text_bg_classes.forEach(cls => {
				header_sel.classList.remove(cls);
				// footer_sel.classList.remove(cls);
			});
			btn_classes.forEach(cls => btn_sel.classList.remove(cls));

			// add desired styles
			header_sel.classList.add(`text-bg-${context}`);
			// footer_sel.classList.add(`text-bg-${context}`);
			btn_sel.classList.add(`btn-${context}`);
		}

		// deal with shadows
		if (shadow) {
			card_sel.classList.add('shadow');
		} else {
			card_sel.classList.remove('shadow');
		}

		// Update status
		if (status) {
			status_sel.innerHTML = status;
		}
	}

	mark_available(status) {
		this.mark_generic('warning', true, status);
		document.getElementById(this.completed_id).checked = false;
		document.getElementById(this.enrolling_id).disabled = false;
		this.completed = false;
		this.enrolling = false;
		this.available = true;
	}

	mark_completed(status) {
		this.mark_generic('success', false, status);
		document.getElementById(this.completed_id).checked = true;
		document.getElementById(this.enrolling_id).disabled = true;
		this.completed = true;
		this.enrolling = false;
		this.available = false;
	}

	mark_enrolling(status) {
		this.mark_generic('primary', true, status);
		document.getElementById(this.completed_id).disabled = false;
		document.getElementById(this.enrolling_id).checked = true;
		this.completed = false;
		this.enrolling = true;
		this.available = false;
	}
}

// With Course defined, now we set up all the course data in an object that
// maps a course name like PHYS_231 to the proper course object.

// This will be an object that maps strings to course objects
let courses = {};

// Define the path to your local JSON file
const jsonFilePath = '/data/courses.json';

// Actually load up the courses object with this function
async function getCourses() {
	// Use the fetch API to read the local JSON file
	await fetch(jsonFilePath)
		.then(response => {
			if (!response.ok) {
				throw new Error(`Network response was not ok: ${response.status}`);
			}
			return response.json(); // Parse the JSON response
		})
		.then(data => {
			// Now you have the JSON data in the 'data' variable
			Object.entries(data).forEach(([key, value]) => {
				courses[key] = new Course(value);
			});
		})
		.catch(error => {
			console.error('Error:', error);
		});
}

// Now do the work. Once the courses are loaded, go nuts!
getCourses().then(() => {
	precalc = courses['MATH 112'];
	calc = courses['MATH 114'];
	document.querySelector('#test-grid').innerHTML += precalc.card_html();
	document.querySelector('#test-grid').innerHTML += calc.card_html();

	// activate modal description listeners
	const buttons = document.querySelectorAll('button.description');
	buttons.forEach(btn => {
		btn.addEventListener('click', function() {
			course = courses[btn.id.split('-').join(' ')];
			course.update_modal();
			document.querySelector('#course-info').focus();
		});
	});
});
