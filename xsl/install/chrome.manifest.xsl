<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
<xsl:output method="text" omit-xml-declaration="yes"/>
<xsl:param name="generate-updateurl"/>
<xsl:param name="extension-filename"/>
<xsl:include href="common-install.xsl"/>
<xsl:template match="extension">
<xsl:text>content	</xsl:text><xsl:value-of select="@name"/>	jar:chrome/<xsl:value-of select="@name"/>.jar!/content/<xsl:value-of select="@name"/>/
<xsl:text>skin	</xsl:text><xsl:value-of select="@name"/>	classic/1.0	jar:chrome/<xsl:value-of select="@name"/>.jar!/skin/classic/<xsl:value-of select="@name"/>/

style	chrome://browser/content/browser.xul	chrome://<xsl:value-of select="@name"/>/skin/<xsl:value-of select="@name"/>.css
style	chrome://global/content/customizeToolbar.xul	chrome://<xsl:value-of select="@name"/>/skin/<xsl:value-of select="@name"/>.css

overlay	chrome://browser/content/browser.xul	chrome://<xsl:value-of select="@name"/>/content/<xsl:value-of select="@name"/>Overlay.xul
overlay	chrome://navigator/content/navigator.xul	chrome://<xsl:value-of select="@name"/>/content/<xsl:value-of select="@name"/>Overlay.xul
overlay	chrome://messenger/content/messenger.xul	chrome://<xsl:value-of select="@name"/>/content/<xsl:value-of select="@name"/>Overlay.xul
overlay	chrome://messenger/content/messageWindow.xul	chrome://<xsl:value-of select="@name"/>/content/<xsl:value-of select="@name"/>Overlay.xul
overlay	chrome://editor/content/editor.xul	chrome://<xsl:value-of select="@name"/>/content/<xsl:value-of select="@name"/>Overlay.xul

<xsl:apply-templates select="locales/locale" mode="chrome-manifest"/>
</xsl:template>
</xsl:stylesheet>
