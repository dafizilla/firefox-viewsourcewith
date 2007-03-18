<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
                xmlns:xalan="http://xml.apache.org/xslt">
<xsl:output method="xml" indent="yes" xalan:indent-amount="2" omit-xml-declaration="no"/>
<xsl:param name="generate-updateurl"/>
<xsl:param name="extension-filename"/>
<xsl:include href="common-install.xsl"/>
<xsl:template match="extension">
<RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:em="http://www.mozilla.org/2004/em-rdf#">

  <Description about="urn:mozilla:install-manifest">
    <em:id><xsl:value-of select="uuid"/></em:id>
    <em:name><xsl:value-of select="title-name"/></em:name>
    <em:version><xsl:value-of select="version"/></em:version>
    <em:description>View page source with external application</em:description>
    <em:creator>Davide Ficano</em:creator>
<xsl:text>

    </xsl:text>
<xsl:apply-templates select="translators/translator" mode="install.rdf"/>
<xsl:apply-templates select="contributors/contributor" mode="install.rdf"/>
<xsl:text>

    </xsl:text>
    <em:homepageURL><xsl:value-of select="homepage"/></em:homepageURL>
<xsl:text>

    </xsl:text>
    <xsl:comment> Front End Integration Hooks (used by Extension Manager) </xsl:comment>
<xsl:text>
    </xsl:text>
    <em:optionsURL>chrome://<xsl:value-of select="@name"/>/content/settings/settings.xul</em:optionsURL>
    <em:iconURL>chrome://<xsl:value-of select="@name"/>/skin/appicon.png</em:iconURL>
<xsl:text>

    </xsl:text>
    <xsl:if test="$generate-updateurl = 'true'">
    <em:updateURL><xsl:value-of select="updateurl"/></em:updateURL>
    </xsl:if>
<xsl:text>

    </xsl:text>
    <em:file>
      <Description about="urn:mozilla:extension:file:{$extension-file}">
        <em:package>content/<xsl:value-of select="@name"/>/</em:package>
        <xsl:apply-templates select="locales/locale" mode="install.rdf"/>
        <em:skin>skin/classic/<xsl:value-of select="@name"/>/</em:skin>
      </Description>
    </em:file>

<xsl:apply-templates select="compatibility/application" mode="install.rdf"/>
  </Description>
</RDF>
</xsl:template>
</xsl:stylesheet>
