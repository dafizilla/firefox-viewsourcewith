<?xml version="1.0"?>
<% response.addHeader("content-type", "text/rdf"); %>
<%
    String item_id      = request.getParameter("item_id");
    String item_version = request.getParameter("item_version");
    String app_id       = request.getParameter("app_id");
    String app_version  = request.getParameter("app_version");

    System.out.println("item_id      =  " + item_id     );
    System.out.println("item_version =  " + item_version);
    System.out.println("app_id       =  " + app_id      );
    System.out.println("app_version  =  " + app_version );
%>
<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
 xmlns:em="http://www.mozilla.org/2004/em-rdf#">

 <RDF:Description about="urn:mozilla:extension:{eecba28f-b68b-4b3a-b501-6ce12e6b8696}">
    <em:updates>
        <RDF:Seq>
            <RDF:li resource="urn:mozilla:extension:{eecba28f-b68b-4b3a-b501-6ce12e6b8696}:0.0.6"/>
        </RDF:Seq>
    </em:updates>
    <em:version>0.0.6</em:version>
    <em:updateLink>http://localhost:8080/dafi/viewsourcewith-0.0.6.xpi</em:updateLink>
 </RDF:Description>

<RDF:Description about="urn:mozilla:extension:{eecba28f-b68b-4b3a-b501-6ce12e6b8696}:0.0.6">
    <em:version>0.0.6</em:version>

    <!-- Firefox --> 
    <em:targetApplication>
        <Description>
            <em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id>
            <em:minVersion>0.7</em:minVersion>
            <em:maxVersion>1.1</em:maxVersion>
            <em:updateLink>http://localhost:8080/dafi/viewsourcewith-0.0.6.xpi</em:updateLink>
        </Description>
    </em:targetApplication>
</RDF:Description>

 </RDF:RDF>
