$( document ).ready(function() {
	$('#projects_page').hide();
	$('#about_page').show();
});

function goProjects(){
	$('#about_page').hide();
	$('#projects_page').show();
}

function goAbout(){
	$('#projects_page').hide();
	$('#about_page').show();
}
