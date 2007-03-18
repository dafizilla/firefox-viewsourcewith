<?php 
    header("content-type: text/rdf"); 
    echo "<?xml version=\"1.0\"?>\n";
    $ext_version = "@VERSION@";
    $upd_link = "http://dafizilla.sourceforge.net/viewsourcewith/viewsourcewith-$ext_version.xpi";
?>
<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:em="http://www.mozilla.org/2004/em-rdf#">

     <RDF:Description about="urn:mozilla:extension:{eecba28f-b68b-4b3a-b501-6ce12e6b8696}">
        <em:updates>
            <RDF:Seq>
                <RDF:li resource="urn:mozilla:extension:{eecba28f-b68b-4b3a-b501-6ce12e6b8696}:<?php echo $ext_version; ?>"/>
            </RDF:Seq>
        </em:updates>
        <em:version><?php echo $ext_version; ?></em:version>
        <em:updateLink><?php echo $upd_link; ?></em:updateLink>
     </RDF:Description>

    <RDF:Description about="urn:mozilla:extension:{eecba28f-b68b-4b3a-b501-6ce12e6b8696}:<?php echo $ext_version; ?>">
        <em:version><?php echo $ext_version; ?></em:version>
    
        <!-- Firefox --> 
        <em:targetApplication>
            <Description>
                <em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id>
                <em:minVersion>0.10</em:minVersion>
                <em:maxVersion>1.1</em:maxVersion>
                <em:updateLink><?php echo $upd_link; ?></em:updateLink>
            </Description>
        </em:targetApplication>

       <!-- Thunderbird -->
       <em:targetApplication>
          <Description>
             <em:id>{3550f703-e582-4d05-9a08-453d09bdfdc6}</em:id>
             <em:minVersion>0.5</em:minVersion>
             <em:maxVersion>1.0</em:maxVersion>
             <em:updateLink><?php echo $upd_link; ?></em:updateLink>
          </Description>
       </em:targetApplication>
    
       <!-- NVU -->
       <em:targetApplication>
          <Description>
             <em:id>{136c295a-4a5a-41cf-bf24-5cee526720d5}</em:id>
             <em:minVersion>0.1</em:minVersion>
             <em:maxVersion>1.0</em:maxVersion>
             <em:updateLink><?php echo $upd_link; ?></em:updateLink>
          </Description>
       </em:targetApplication>

       <!-- Netscape -->
       <em:targetApplication>
          <Description>
             <em:id>{3db10fab-e461-4c80-8b97-957ad5f8ea47}</em:id>
             <em:minVersion>8.0</em:minVersion>
             <em:maxVersion>8.0.9</em:maxVersion>
          </Description>
       </em:targetApplication>

    </RDF:Description>

 </RDF:RDF>
