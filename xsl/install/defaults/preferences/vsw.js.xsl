<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
<xsl:output method="text" omit-xml-declaration="yes"/>
<xsl:param name="generate-updateurl"/>
<xsl:param name="extension-filename"/>
<xsl:include href="common-install.xsl"/>
<xsl:template match="extension">pref("extensions.<xsl:value-of select="uuid"/>.description", "chrome://<xsl:value-of select="@name"/>/locale/<xsl:value-of select="@name"/>.properties");
</xsl:template>
</xsl:stylesheet>

