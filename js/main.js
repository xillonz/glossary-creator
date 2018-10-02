var gen = {
    glossary: {},
    selected: null,
    makeId: function(){
        return '_' + Math.random().toString(36).substr(2, 9);
    },

    download: function(files) { 
        var zip = new JSZip();

        for( var n = 0; n < files.length; n++ )
        {
            zip.file(files[n].name, files[n].data);
        }

        zip.generateAsync({type:"blob"})
        .then(function(content) {
            saveAs(content, "Glossary.zip");
        });
    },

    getGlossaryHTML: function() {
        var glossary = $('#glossary-template');        
        var table = glossary.find('#glossary-body');   
        table.empty();  

        $('#glossary-title').html(gen.getGlossaryTitle());
        
        var keysSorted = Object.keys(gen.glossary).sort(function(a,b){
            return gen.glossary[a].term.localeCompare(gen.glossary[b].term)
        })

        for(var i = 0; i < keysSorted.length; i++){
            var entry = gen.glossary[keysSorted[i]];
            var html = '<tr id="entry'+keysSorted[i]+'">';
                html +=     '<td>'+entry.term+'</td>';
                html +=     '<td>'+entry.fullName+'</td>';
                html +=     '<td>'+entry.description+'</td>';

            if(entry.link){
                html +=     '<td>';
                var links = entry.link.replace( /\n/g, " " ).split( " " );
                for(var j = 0; j < links.length; j++){
                    if(links[j]) html += '<a class="external-link" href="'+links[j]+'" target="_blank">'+links[j]+'</a>';
                } 
                html +=     '</td>';              
            }else{
                html +=     '<td></td>';
            }
                
                html += '</tr>';

            table.append(html);
        }

        return glossary.html();
    },

    getGlossaryTitle: function(){
        var title = ($('#title').val()) ? $('#title').val() : "Glossary";

        return title;
    },

    generate: function(){
        var files = [
            {
                name: 'glossarydata.json',
                data: JSON.stringify({
                    glossary: gen.glossary,
                    title: gen.getGlossaryTitle()
                })
            },
            {
                name: 'glossary.html',
                data: gen.getGlossaryHTML()
            }
        ];

        gen.download(files);
    },

    uploadData: function(evt){
        var file = evt.target.files[0]; // File

        fr = new FileReader();
        fr.onload = gen.populate;
        fr.readAsText(file);        
    },

    populate: function(){
        var parseFile = JSON.parse(fr.result);
        if(!parseFile.glossary){
            alert('This file is incorrect, please upload a glossary file');
        }else{
            var glossaryJson = parseFile.glossary;
            var title = (parseFile.title) ? parseFile.title : '';
            gen.glossary = gen.generateLinks(glossaryJson);
            $('#title').val(title);
            gen.displayList();
        }        
    },

    generateLinks: function(glossary){
        var terms = {};
        var description, termIndex, linkText, textStart, textEnd, target, link;
        for(var key in glossary){
            terms[glossary[key].term] = key;
        }

        for(var key in glossary){
            description = glossary[key].description;

            for(var term in terms){
                if(glossary[key].term === term) continue;

                termIndex = description.indexOf(term);
                if(termIndex !== -1){                      
                    textStart = description.substring(0, termIndex);
                    textEnd = description.substring(termIndex + term.length, description.length);
                    
                    link = gen.getLinkHTML(terms[term], description, termIndex, termIndex + term.length);

                    description = textStart + link + textEnd;
                    searchStart = termIndex + term.length + 44;
                }
            }            

            glossary[key].description = description;                
        }

        return glossary;
    },

    displayList: function(){
        var listEl = $('#term-list');
        var linkEl = $('#link-to');
        listEl.empty();
        linkEl.empty();
        linkEl.append('<option value="" selected disabled>Choose a Term</option>');
        $('.empty-list-msg').toggleClass('hide', !$.isEmptyObject(gen.glossary))

        var keysSorted = Object.keys(gen.glossary).sort(function(a,b){
            return gen.glossary[a].term.localeCompare(gen.glossary[b].term)
        })
        for(var i = 0; i < keysSorted.length; i++){
            var entry = gen.glossary[keysSorted[i]];
            listEl.append('<li id="entry'+keysSorted[i]+'" data-id="'+keysSorted[i]+'"><p class="term-title">'+entry.term+'<button type="button" class="edit-btn btn">Edit</button></p><p class="term-description">'+entry.description+'</p></li>')
            linkEl.append('<option value="'+keysSorted[i]+'">'+entry.term+'</option>')
        }
    },

    refreshPage: function() {
        $('#term').val(''),
        $('#full-name').val(''),
        $('#description').val(''),
        $('#link').val('')
        $('#entry-id').val('new')

        $('#delete-entry').addClass('hide');

        gen.selected = null;
        gen.displayList();    
    },

    saveEntry: function(){
        if(!$('#term').val()){
            alert('Please enter a term');
            return;
        }
        var entry = {
            term: $('#term').val(),
            fullName: $('#full-name').val(),
            description: $('#description').val(),
            link: $('#link').val()
        }
        var id = $('#entry-id').val();
        if(id === 'new'){
            id = gen.makeId();
        }

        gen.glossary[id] = entry;

        gen.refreshPage();
    },

    loadData: function(btn) {
        var id = btn.parents('li').data('id');
        var entry = gen.glossary[id];

        if(!entry){
            alert('Term not found')
        }else{
            $('#entry-id').val(id);
            $('#term').val(entry.term),
            $('#full-name').val(entry.fullName),
            $('#description').val(entry.description),
            $('#link').val(entry.link)
        }   
        
        $('#delete-entry').removeClass('hide');
    },

    deleteEntry: function() {
        var id = $('#entry-id').val();
        var entry = gen.glossary[id];

        if(!entry || id === 'new'){
            alert('Term not found')
        }
        
        delete gen.glossary[id]

        gen.refreshPage();
    },

    storeSel: function() {
        var txtarea = $("#description")[0];

        var start = txtarea.selectionStart;
        var finish = txtarea.selectionEnd
        var text = txtarea.value.substring(start, finish)

        if(text){
            gen.selected = {
                start: start,
                finish: finish,
                text: text
            }
        }
    },

    getLinkHTML: function(target, body, start, finish, text) {
        var textStart = body.substring(0,start);
        var textEnd = body.substring(finish,body.length);
        if(typeof text === 'undefined' || !text) text = body.substring(start,finish);

        return '<a href="#entry'+target+'" class="term-link">'+text+'</a>'
    },

    insertLink: function() {
        if(!gen.selected){
            alert("Please select some description text first")
        }else{
            var text = $('#description').val()
            var textStart = text.substring(0,gen.selected.start);
            var textEnd = text.substring(gen.selected.finish,text.length);

            var target = $('#link-to').val();
            
            var link = gen.getLinkHTML(target, body, gen.selected.start, gen.selected.finish, gen.selected.text);

            $('#description').val(textStart + link + textEnd);

            $('#link-to').val($("#link-to option:first").val());

            gen.selected = null;
        }
    },

    bind: function() {
        $('#generate').on('click', gen.generate); 
        $('#data').on('change', gen.uploadData);
        $('#save-entry').on('click', gen.saveEntry);
        $('#delete-entry').on('click', gen.deleteEntry);
        $('#description').mouseup(gen.storeSel); 
        $('#link-to').on('change', gen.insertLink)
        $(document).on('click', '.edit-btn', function(){
            gen.loadData($(this));
        });               
    },
    init: function() {  
        this.bind();
    }
}